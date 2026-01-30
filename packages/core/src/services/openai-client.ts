import { getConfig } from "../config/index.js";

export interface OpenAIClient {
  summarize(messages: string, previousSummaries?: string[]): Promise<string>;
}

function buildPrompt(messages: string, previousSummaries: string[]): string {
  let prompt = `Generate a SHORT status update (max 60 chars) for a coding assistant based on the log messages below.

IMPORTANT:
- Be SPECIFIC about what action is happening (reading, editing, analyzing, etc.)
- NEVER say generic things like "working on task" or "processing"
- Extract the actual action from the messages
- Do not generate the same status update twice, If the Previous Summaries contain a line DO NOT repeat it

Examples of GOOD updates:
- "Searching for React components..."
- "Reading the main app file..."
- "Adding a new button element..."
- "Modifying the header styles..."
- "Analyzing the code structure..."

Examples of BAD updates (never say these):
- "Agent working on task..."
- "Processing..."
- "Working..."`;

  if (previousSummaries.length > 0) {
    prompt += `\n\nALREADY SENT (do not repeat):
${previousSummaries.map((s) => `- "${s}"`).join("\n")}`;
    console.log("Previous summaries:", previousSummaries);
  }

  prompt += `\n\nLog messages:\n${messages}\n\nYour status update:`;

  return prompt;
}

export function createOpenAIClient(): OpenAIClient | null {
  const config = getConfig();

  if (!config.sanitizer) {
    return null;
  }

  const { openaiApiKey, openaiModel } = config.sanitizer;

  return {
    async summarize(messages: string, previousSummaries: string[] = []): Promise<string> {
      const prompt = buildPrompt(messages, previousSummaries);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_completion_tokens: 150,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[OpenAI] Full response:`, JSON.stringify(data, null, 2));

      const typedData = data as {
        choices: Array<{ message: { content: string } }>;
      };

      let content = typedData.choices[0]?.message?.content?.trim() || "Analyzing code...";
      // Strip surrounding quotes if present
      if ((content.startsWith('"') && content.endsWith('"')) ||
          (content.startsWith("'") && content.endsWith("'"))) {
        content = content.slice(1, -1);
      }
      return content;
    },
  };
}
