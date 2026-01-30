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
   * Migrates old entries that don't have chain fields.
   */
  private loadData(): TaskPersistenceData {
    if (existsSync(this.filePath)) {
      try {
        const content = readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(content) as TaskPersistenceData;

        // Migrate old entries that don't have chain fields
        let migrated = false;
        const tasksByUser = new Map<string, PersistedTaskEntry[]>();

        // Group tasks by user
        for (const task of data.tasks) {
          const userId = task.appmorph_user_id;
          if (!tasksByUser.has(userId)) {
            tasksByUser.set(userId, []);
          }
          tasksByUser.get(userId)!.push(task);
        }

        // Process each user's tasks
        for (const [_userId, userTasks] of tasksByUser) {
          // Sort by created_at to maintain order
          userTasks.sort((a, b) => a.created_at - b.created_at);

          for (let i = 0; i < userTasks.length; i++) {
            const task = userTasks[i];
            if (task.status === undefined) {
              task.status = 'active';
              migrated = true;
            }
            if (task.chain_position === undefined) {
              task.chain_position = i;
              migrated = true;
            }
            if (task.parent_session_id === undefined) {
              task.parent_session_id = i > 0 ? userTasks[i - 1].session_id : null;
              migrated = true;
            }
          }
        }

        if (migrated) {
          console.log('[Persistence] Migrated old task entries to chain format');
          this.data = data;
          this.saveData();
        }

        return data;
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

  /**
   * Get the user's active chain (ordered by chain_position).
   */
  getUserChain(appmorphUserId: string): PersistedTaskEntry[] {
    return this.data.tasks
      .filter((task) => task.appmorph_user_id === appmorphUserId && task.status === 'active')
      .sort((a, b) => a.chain_position - b.chain_position);
  }

  /**
   * Get the latest active task for a user (head of the chain).
   */
  getLatestTaskForUser(appmorphUserId: string): PersistedTaskEntry | undefined {
    const chain = this.getUserChain(appmorphUserId);
    return chain.length > 0 ? chain[chain.length - 1] : undefined;
  }

  /**
   * Mark tasks as rolled back (all entries AFTER the target position).
   * Returns the entries that were marked as rolled back.
   */
  rollbackToPosition(appmorphUserId: string, targetPosition: number): PersistedTaskEntry[] {
    const rolledBack: PersistedTaskEntry[] = [];

    this.data.tasks.forEach((task) => {
      if (
        task.appmorph_user_id === appmorphUserId &&
        task.chain_position > targetPosition &&
        task.status === 'active'
      ) {
        task.status = 'rolled_back';
        rolledBack.push(task);
      }
    });

    this.saveData();
    return rolledBack;
  }

  /**
   * Delete rolled back entries from persistence.
   * Returns the session IDs that were deleted.
   */
  deleteRolledBackEntries(appmorphUserId: string): string[] {
    const toDelete = this.data.tasks.filter(
      (t) => t.appmorph_user_id === appmorphUserId && t.status === 'rolled_back'
    );
    const deletedIds = toDelete.map((t) => t.session_id);

    this.data.tasks = this.data.tasks.filter(
      (t) => !(t.appmorph_user_id === appmorphUserId && t.status === 'rolled_back')
    );

    this.saveData();
    return deletedIds;
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
