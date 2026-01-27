// ============================================
// User & Auth Types
// ============================================

export interface UserContext {
  userId: string;
  groupIds: string[];
  tenantId?: string;
  roles?: string[];
}

export interface AuthAdapter {
  getUserContext(): Promise<UserContext>;
  getAuthToken(): Promise<string>;
}

// ============================================
// Agent Types
// ============================================

export interface AgentConstraints {
  allowedPaths?: string[];
  blockedPaths?: string[];
  allowedCommands?: string[];
  blockedCommands?: string[];
  maxFileSize?: number;
  maxTotalChanges?: number;
}

export interface AgentRunContext {
  prompt: string;
  repoPath: string;
  branch: string;
  instructions?: string;
  constraints: AgentConstraints;
}

export interface AgentProgress {
  type: 'log' | 'file_change' | 'thinking';
  content: string;
  timestamp: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration?: number;
  error?: string;
}

export interface AgentResult {
  success: boolean;
  commitSha?: string;
  filesChanged: string[];
  summary: string;
  testResults?: TestResult[];
}

// ============================================
// Task Types
// ============================================

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  userId: string;
  groupId?: string;
  branch: string;
  createdAt: number;
  updatedAt: number;
  result?: AgentResult;
  error?: string;
}

export interface CreateTaskRequest {
  prompt: string;
  groupId?: string;
}

export interface CreateTaskResponse {
  taskId: string;
  branch: string;
}

export interface TaskStatusResponse {
  task: Task;
}

// ============================================
// Version Types
// ============================================

export interface VersionMapping {
  groupId: string;
  commitSha: string;
  deployedAt: number;
  deployedBy: string;
  previewUrl?: string;
}

export interface VersionsConfig {
  production: VersionMapping | null;
  groups: Record<string, VersionMapping>;
}

export interface PromoteRequest {
  groupId: string;
  commitSha: string;
  toProduction?: boolean;
}

export interface PromoteResponse {
  success: boolean;
  previewUrl?: string;
  productionUrl?: string;
}

export interface RevertRequest {
  groupId?: string;
  toCommitSha?: string;
}

export interface RevertResponse {
  success: boolean;
  revertedTo: string;
}

// ============================================
// Config Types (appmorph.json)
// ============================================

export interface AppmorphConfig {
  version: '1';
  repo: RepoConfig;
  agent: AgentConfig;
  constraints?: AgentConstraints;
  plugins?: PluginConfig[];
}

export interface RepoConfig {
  type: 'git' | 'github' | 'gitlab';
  url: string;
  defaultBranch?: string;
}

export interface AgentConfig {
  type: 'claude-cli';
  model?: string;
  maxTokens?: number;
  instructions?: string;
}

export interface PluginConfig {
  name: string;
  path?: string;
  options?: Record<string, unknown>;
}

// ============================================
// Plugin Types
// ============================================

export interface AuthDecision {
  allowed: boolean;
  reason?: string;
}

export interface VetoResult {
  vetoed: true;
  reason: string;
}

export interface TaskContext {
  task: Task;
  user: UserContext;
  config: AppmorphConfig;
}

export interface StageContext {
  task: Task;
  user: UserContext;
  branch: string;
  commitSha: string;
}

export interface StageResult {
  success: boolean;
  previewUrl?: string;
  error?: string;
}

export interface PromoteContext {
  user: UserContext;
  groupId: string;
  commitSha: string;
  toProduction: boolean;
}

export interface PromoteResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface RevertContext {
  user: UserContext;
  groupId?: string;
  fromCommitSha: string;
  toCommitSha: string;
}

export interface AuditEvent {
  type: 'task_created' | 'task_completed' | 'promoted' | 'reverted';
  timestamp: number;
  user: UserContext;
  details: Record<string, unknown>;
}

export type Action =
  | { type: 'create_task'; groupId?: string }
  | { type: 'view_task'; taskId: string }
  | { type: 'promote'; groupId: string; toProduction: boolean }
  | { type: 'revert'; groupId?: string };

export interface AuthContext {
  user: UserContext;
  config: AppmorphConfig;
}

// ============================================
// SDK Types
// ============================================

export interface AppmorphInitOptions {
  endpoint: string;
  auth: AuthAdapter;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  buttonLabel?: string;
}

export interface AppmorphSDK {
  init(options: AppmorphInitOptions): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
  submitPrompt(prompt: string): Promise<CreateTaskResponse>;
  getTaskStatus(taskId: string): Promise<TaskStatusResponse>;
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
