import { AgentProgress, SanitizedSummary } from '@appmorph/shared';
import { getConfig } from '../config/index.js';
import { createOpenAIClient } from './openai-client.js';

interface TaskBuffer {
  messages: AgentProgress[];
  timer: ReturnType<typeof setInterval> | null;
  previousSummaries: string[];
}

export type SummaryCallback = (summary: SanitizedSummary) => void;

export interface MessageSanitizer {
  isEnabled(): boolean;
  addMessage(taskId: string, progress: AgentProgress): void;
  completeTask(taskId: string): void;
  abortTask(taskId: string): void;
}

let sanitizerInstance: MessageSanitizer | null = null;

export function initMessageSanitizer(onSummary: SummaryCallback): MessageSanitizer {
  const config = getConfig();
  const openaiClient = createOpenAIClient();
  const taskBuffers = new Map<string, TaskBuffer>();
  const intervalMs = config.sanitizer?.intervalMs ?? 2000;

  async function flushBuffer(taskId: string): Promise<void> {
    const buffer = taskBuffers.get(taskId);
    if (!buffer || buffer.messages.length === 0 || !openaiClient) {
      return;
    }

    const messagesToSend = [...buffer.messages];
    buffer.messages = [];

    try {
      const combinedMessages = messagesToSend
        .map((m) => `[${m.type}] ${m.content}`)
        .join('\n');

      const summary = await openaiClient.summarize(combinedMessages, buffer.previousSummaries);

      // Store this summary for next time
      buffer.previousSummaries.push(summary);

      onSummary({
        taskId,
        summary,
        messageCount: messagesToSend.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[MessageSanitizer] Failed to summarize for task ${taskId}:`, error);
      // On error, send a generic message so clients know work is happening
      onSummary({
        taskId,
        summary: 'Agent processing task...',
        messageCount: messagesToSend.length,
        timestamp: Date.now(),
      });
    }
  }

  function startTimer(taskId: string): void {
    const buffer = taskBuffers.get(taskId);
    if (!buffer || buffer.timer) {
      return;
    }

    buffer.timer = setInterval(() => {
      flushBuffer(taskId);
    }, intervalMs);
  }

  function stopTimer(taskId: string): void {
    const buffer = taskBuffers.get(taskId);
    if (!buffer?.timer) {
      return;
    }

    clearInterval(buffer.timer);
    buffer.timer = null;
  }

  sanitizerInstance = {
    isEnabled(): boolean {
      return openaiClient !== null;
    },

    addMessage(taskId: string, progress: AgentProgress): void {
      if (!openaiClient) {
        return;
      }

      if (!taskBuffers.has(taskId)) {
        taskBuffers.set(taskId, { messages: [], timer: null, previousSummaries: [] });
      }

      const buffer = taskBuffers.get(taskId)!;
      buffer.messages.push(progress);

      // Start timer if not already running
      if (!buffer.timer) {
        startTimer(taskId);
      }
    },

    completeTask(taskId: string): void {
      stopTimer(taskId);
      // Flush any remaining messages
      flushBuffer(taskId).finally(() => {
        taskBuffers.delete(taskId);
      });
    },

    abortTask(taskId: string): void {
      stopTimer(taskId);
      taskBuffers.delete(taskId);
    },
  };

  return sanitizerInstance;
}

export function getMessageSanitizer(): MessageSanitizer | null {
  return sanitizerInstance;
}
