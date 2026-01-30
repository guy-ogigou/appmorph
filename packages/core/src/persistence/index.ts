import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { PersistedTaskEntry } from '@appmorph/shared';

const DEFAULT_PERSISTENCE_FILE = 'appmorph_tasks.json';

interface TaskPersistenceData {
  tasks: PersistedTaskEntry[];
}

/**
 * Manager for persisting task entries to a JSON file.
 */
export class TaskPersistence {
  private filePath: string;
  private data: TaskPersistenceData;

  constructor(filePath?: string) {
    this.filePath = filePath || resolve(process.cwd(), DEFAULT_PERSISTENCE_FILE);
    this.data = this.loadData();
  }

  /**
   * Load existing data from file or initialize empty data.
   */
  private loadData(): TaskPersistenceData {
    if (existsSync(this.filePath)) {
      try {
        const content = readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content) as TaskPersistenceData;
      } catch (error) {
        console.warn(`Failed to load persistence file: ${error}. Starting with empty data.`);
        return { tasks: [] };
      }
    }
    return { tasks: [] };
  }

  /**
   * Save data to file.
   */
  private saveData(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save persistence file: ${error}`);
    }
  }

  /**
   * Add a new task entry to persistence.
   */
  addTaskEntry(entry: PersistedTaskEntry): void {
    this.data.tasks.push(entry);
    this.saveData();
  }

  /**
   * Get all persisted task entries.
   */
  getAllTasks(): PersistedTaskEntry[] {
    return [...this.data.tasks];
  }

  /**
   * Get task entries by appmorph_user_id.
   */
  getTasksByUserId(appmorphUserId: string): PersistedTaskEntry[] {
    return this.data.tasks.filter((task) => task.appmorph_user_id === appmorphUserId);
  }

  /**
   * Get task entry by session_id.
   */
  getTaskBySessionId(sessionId: string): PersistedTaskEntry | undefined {
    return this.data.tasks.find((task) => task.session_id === sessionId);
  }
}

// Singleton instance
let persistenceInstance: TaskPersistence | null = null;

export function getTaskPersistence(): TaskPersistence {
  if (!persistenceInstance) {
    persistenceInstance = new TaskPersistence();
  }
  return persistenceInstance;
}
