export const BRANCH_PREFIX = {
  GROUP: 'appmorph/g/',
  USER: 'appmorph/u/',
} as const;

export const DEFAULT_CONFIG_FILE = 'appmorph.json';
export const VERSIONS_FILE = 'appmorph.versions.json';

export const API_ROUTES = {
  HEALTH: '/health',
  TASK: '/api/task',
  TASK_STATUS: '/api/task/:taskId',
  TASK_STREAM: '/api/task/:taskId/stream',
  VERSION: '/api/version',
  PROMOTE: '/api/promote',
  REVERT: '/api/revert',
  CHAIN: '/api/chain',
  CHAIN_ROLLBACK: '/api/chain/rollback',
} as const;

export const SSE_EVENTS = {
  PROGRESS: 'progress',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;
