/**
 * E2E Test: Task Chain
 *
 * Tests the complete task chain flow using mocked Claude CLI responses.
 * Verifies:
 * 1. Creating a 3-step task chain
 * 2. Each step correctly builds on the previous
 * 3. Rollback removes later changes while preserving earlier ones
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { FastifyInstance } from 'fastify';

// Import managers and utilities
import { createServer } from '../../src/server/app.js';
import { initStagingManager, resetStagingManager } from '../../src/staging/index.js';
import { initBuildManager, resetBuildManager } from '../../src/build/index.js';
import { initDeployManager, resetDeployManager } from '../../src/deploy/index.js';
import { initTaskPersistence, resetTaskPersistence, getTaskPersistence } from '../../src/persistence/index.js';
import { resetTaskExecutor } from '../../src/task/executor.js';
import { setConfig, resetConfig } from '../../src/config/index.js';
import { setAppmorphProjectConfig, resetAppmorphProjectConfig } from '../../src/config/index.js';
import { MockAgent, setMockAgentFactory, clearMockAgentFactory } from '../../src/agent/mock-agent.js';

// Import test fixtures
import { demoChainSteps, originalAppTsx } from '../fixtures/demo-chain/index.js';

// Test constants
const TEST_USER_ID = 'test-user-e2e';
const API_BASE = '/api';

describe('Task Chain E2E', () => {
  let server: FastifyInstance;
  let testDir: string;
  let sourceDir: string;
  let stageDir: string;
  let deployDir: string;
  let persistenceFile: string;

  // Track created task IDs for cleanup and rollback testing
  const createdTaskIds: string[] = [];

  /**
   * Helper to read file content from the stage directory.
   */
  function readStagedFile(sessionId: string, relativePath: string): string {
    const stagePath = join(stageDir, sessionId, relativePath);
    if (!existsSync(stagePath)) {
      throw new Error(`Staged file not found: ${stagePath}`);
    }
    return readFileSync(stagePath, 'utf-8');
  }

  /**
   * Helper to create a task via the API.
   */
  async function createTask(prompt: string): Promise<{
    taskId: string;
    branch: string;
  }> {
    const response = await server.inject({
      method: 'POST',
      url: `${API_BASE}/task`,
      headers: {
        'content-type': 'application/json',
        'x-user-id': TEST_USER_ID,
        'x-appmorph-user-id': TEST_USER_ID,
      },
      payload: JSON.stringify({ prompt }),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.taskId).toBeDefined();

    createdTaskIds.push(body.taskId);
    return body;
  }

  /**
   * Helper to wait for a task to complete.
   */
  async function waitForTaskCompletion(taskId: string, timeoutMs = 10000): Promise<{
    success: boolean;
    status: string;
    filesChanged?: string[];
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const response = await server.inject({
        method: 'GET',
        url: `${API_BASE}/task/${taskId}`,
        headers: {
          'x-user-id': TEST_USER_ID,
          'x-appmorph-user-id': TEST_USER_ID,
        },
      });

      if (response.statusCode !== 200) {
        throw new Error(`Failed to get task status: ${response.statusCode}`);
      }

      const body = JSON.parse(response.payload);
      const task = body.task;

      if (task.status === 'completed') {
        return {
          success: true,
          status: task.status,
          filesChanged: task.result?.filesChanged,
        };
      }

      if (task.status === 'failed') {
        return {
          success: false,
          status: task.status,
        };
      }

      // Wait a bit before polling again
      await new Promise((r) => setTimeout(r, 100));
    }

    throw new Error(`Task ${taskId} did not complete within ${timeoutMs}ms`);
  }

  /**
   * Helper to get the user's chain.
   */
  async function getChain(): Promise<{
    chain: Array<{
      session_id: string;
      prompt: string;
      chain_position: number;
      is_current: boolean;
    }>;
    current_session_id: string | null;
  }> {
    const response = await server.inject({
      method: 'GET',
      url: `${API_BASE}/chain`,
      headers: {
        'x-user-id': TEST_USER_ID,
        'x-appmorph-user-id': TEST_USER_ID,
      },
    });

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.payload);
  }

  /**
   * Helper to rollback to a specific session.
   */
  async function rollbackTo(targetSessionId: string): Promise<{
    success: boolean;
    removed_sessions: string[];
    current_session_id: string | null;
  }> {
    const response = await server.inject({
      method: 'POST',
      url: `${API_BASE}/chain/rollback`,
      headers: {
        'content-type': 'application/json',
        'x-user-id': TEST_USER_ID,
        'x-appmorph-user-id': TEST_USER_ID,
      },
      payload: JSON.stringify({ target_session_id: targetSessionId }),
    });

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.payload);
  }

  beforeAll(async () => {
    // Create a temporary test directory
    testDir = resolve(process.cwd(), 'test-temp-e2e-' + Date.now());
    sourceDir = join(testDir, 'source');
    stageDir = join(testDir, 'stage');
    deployDir = join(testDir, 'deploy');
    persistenceFile = join(testDir, 'tasks.json');

    // Create directories
    mkdirSync(testDir, { recursive: true });
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(stageDir, { recursive: true });
    mkdirSync(deployDir, { recursive: true });

    // Create source files (minimal demo app structure)
    mkdirSync(join(sourceDir, 'src'), { recursive: true });
    writeFileSync(join(sourceDir, 'src', 'App.tsx'), originalAppTsx);
    writeFileSync(
      join(sourceDir, 'package.json'),
      JSON.stringify({
        name: 'test-demo-app',
        version: '1.0.0',
        type: 'module',
        scripts: {
          build: 'echo "build complete"',
        },
      }, null, 2)
    );

    // Set up mock agent factory
    const mockAgent = new MockAgent(demoChainSteps);
    setMockAgentFactory(() => mockAgent);

    // Configure singleton managers for testing
    const projectConfig = {
      source_type: 'file_system' as const,
      source_location: sourceDir,
      build_command: 'echo "build" > <dist>/build.txt',
      deploy_type: 'file_system' as const,
      deploy_root: deployDir,
    };

    // Reset all singletons
    resetConfig();
    resetAppmorphProjectConfig();
    resetStagingManager();
    resetBuildManager();
    resetDeployManager();
    resetTaskPersistence();
    resetTaskExecutor();

    // Set custom config for testing (mock the claude command check)
    setConfig({
      port: 0, // Random port
      host: '127.0.0.1',
      projectPath: sourceDir,
      agent: {
        type: 'claude-cli',
        command: 'echo', // Mock command that exists
      },
    });

    // Set project config
    setAppmorphProjectConfig(projectConfig);

    // Initialize managers with test paths
    const stagingManager = initStagingManager(projectConfig);

    // Override stageRoot to use test directory
    // @ts-expect-error - accessing private property for testing
    stagingManager.stageRoot = stageDir;

    initBuildManager(projectConfig);
    initDeployManager(projectConfig);
    initTaskPersistence(persistenceFile);

    // Create the server
    server = await createServer();
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await server.close();
    }

    // Clear mock agent factory
    clearMockAgentFactory();

    // Reset all singletons
    resetConfig();
    resetAppmorphProjectConfig();
    resetStagingManager();
    resetBuildManager();
    resetDeployManager();
    resetTaskPersistence();
    resetTaskExecutor();

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear tracked task IDs
    createdTaskIds.length = 0;
  });

  describe('3-step task chain', () => {
    let task1Id: string;
    let task2Id: string;
    let task3Id: string;

    it('Step 1: creates task to add reset button', async () => {
      const { taskId } = await createTask('Add a reset button to the counter');
      task1Id = taskId;

      // Wait for completion
      const result = await waitForTaskCompletion(taskId);
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');

      // Verify file changes in stage
      const appContent = readStagedFile(taskId, 'src/App.tsx');
      expect(appContent).toContain('Reset');
      expect(appContent).toContain('resetButton');
      expect(appContent).toContain('setCount(0)');

      // Verify chain
      const chain = await getChain();
      expect(chain.chain.length).toBe(1);
      expect(chain.chain[0].session_id).toBe(taskId);
      expect(chain.chain[0].chain_position).toBe(0);
      expect(chain.chain[0].is_current).toBe(true);
      expect(chain.current_session_id).toBe(taskId);
    });

    it('Step 2: creates chained task to change header color to green', async () => {
      const { taskId } = await createTask('Change the header color to green');
      task2Id = taskId;

      // Wait for completion
      const result = await waitForTaskCompletion(taskId);
      expect(result.success).toBe(true);

      // Verify file changes in stage
      const appContent = readStagedFile(taskId, 'src/App.tsx');

      // Step 2 changes: green header
      expect(appContent).toContain('#22c55e');

      // Step 1 changes should be preserved
      expect(appContent).toContain('Reset');
      expect(appContent).toContain('resetButton');

      // Verify chain
      const chain = await getChain();
      expect(chain.chain.length).toBe(2);
      expect(chain.chain[1].session_id).toBe(taskId);
      expect(chain.chain[1].chain_position).toBe(1);
      expect(chain.chain[1].is_current).toBe(true);
      expect(chain.current_session_id).toBe(taskId);
    });

    it('Step 3: creates chained task to add counter message', async () => {
      const { taskId } = await createTask('Add a counter message');
      task3Id = taskId;

      // Wait for completion
      const result = await waitForTaskCompletion(taskId);
      expect(result.success).toBe(true);

      // Verify file changes in stage
      const appContent = readStagedFile(taskId, 'src/App.tsx');

      // Step 3 changes: counter message
      expect(appContent).toContain('Count is');
      expect(appContent).toContain('countMessage');

      // Step 2 changes should be preserved
      expect(appContent).toContain('#22c55e');

      // Step 1 changes should be preserved
      expect(appContent).toContain('Reset');
      expect(appContent).toContain('resetButton');

      // Verify chain
      const chain = await getChain();
      expect(chain.chain.length).toBe(3);
      expect(chain.chain[2].session_id).toBe(taskId);
      expect(chain.chain[2].chain_position).toBe(2);
      expect(chain.chain[2].is_current).toBe(true);
      expect(chain.current_session_id).toBe(taskId);
    });

    it('Rollback: reverts to step 1, removing steps 2 and 3', async () => {
      // Rollback to step 1
      const rollbackResult = await rollbackTo(task1Id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.removed_sessions).toContain(task2Id);
      expect(rollbackResult.removed_sessions).toContain(task3Id);
      expect(rollbackResult.removed_sessions.length).toBe(2);
      expect(rollbackResult.current_session_id).toBe(task1Id);

      // Verify chain state after rollback
      const chain = await getChain();
      expect(chain.chain.length).toBe(1);
      expect(chain.chain[0].session_id).toBe(task1Id);
      expect(chain.current_session_id).toBe(task1Id);

      // Verify step 1 stage still exists with correct content
      const appContent = readStagedFile(task1Id, 'src/App.tsx');

      // Step 1 changes should exist
      expect(appContent).toContain('Reset');
      expect(appContent).toContain('resetButton');

      // Step 2 changes should NOT exist
      expect(appContent).not.toContain('#22c55e');

      // Step 3 changes should NOT exist
      expect(appContent).not.toContain('Count is');
      expect(appContent).not.toContain('countMessage');

      // Verify step 2 and 3 stages are cleaned up
      expect(existsSync(join(stageDir, task2Id))).toBe(false);
      expect(existsSync(join(stageDir, task3Id))).toBe(false);
    });
  });

  describe('persistence', () => {
    it('persists task entries to JSON file', async () => {
      // Create a task
      const { taskId } = await createTask('Add a reset button');
      await waitForTaskCompletion(taskId);

      // Check persistence file
      expect(existsSync(persistenceFile)).toBe(true);

      const persistence = getTaskPersistence();
      const tasks = persistence.getAllTasks();

      // Should have at least one task
      expect(tasks.length).toBeGreaterThan(0);

      // Find our task
      const ourTask = tasks.find((t) => t.session_id === taskId);
      expect(ourTask).toBeDefined();
      expect(ourTask?.appmorph_user_id).toBe(TEST_USER_ID);
      expect(ourTask?.prompt).toContain('reset button');
      expect(ourTask?.status).toBe('active');
    });

    it('tracks chain position correctly', async () => {
      // Reset the persistence for a clean state
      const freshPersistence = join(testDir, 'tasks-chain-test.json');
      resetTaskPersistence();
      initTaskPersistence(freshPersistence);

      // Create two tasks
      const { taskId: id1 } = await createTask('Add a reset button');
      await waitForTaskCompletion(id1);

      const { taskId: id2 } = await createTask('Change header to green');
      await waitForTaskCompletion(id2);

      const persistence = getTaskPersistence();
      const task1 = persistence.getTaskBySessionId(id1);
      const task2 = persistence.getTaskBySessionId(id2);

      expect(task1?.chain_position).toBe(0);
      expect(task1?.parent_session_id).toBeNull();

      expect(task2?.chain_position).toBe(1);
      expect(task2?.parent_session_id).toBe(id1);
    });
  });

  describe('chain API', () => {
    it('returns empty chain for new user', async () => {
      // Use a different user ID
      const response = await server.inject({
        method: 'GET',
        url: `${API_BASE}/chain`,
        headers: {
          'x-user-id': 'new-user-' + Date.now(),
          'x-appmorph-user-id': 'new-user-' + Date.now(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.chain).toEqual([]);
      expect(body.current_session_id).toBeNull();
    });

    it('returns error for rollback to non-existent session', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `${API_BASE}/chain/rollback`,
        headers: {
          'content-type': 'application/json',
          'x-user-id': TEST_USER_ID,
          'x-appmorph-user-id': TEST_USER_ID,
        },
        payload: JSON.stringify({ target_session_id: 'non-existent-session' }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });
});
