import { FastifyRequest } from 'fastify';
import {
  UserContext,
  Action,
  AuthContext,
  AuthDecision,
  TaskContext,
  VetoResult,
  AgentResult,
  StageContext,
  StageResult,
  PromoteContext,
  PromoteResult,
  RevertContext,
  AuditEvent,
} from '@appmorph/shared';

/**
 * AppmorphPlugin interface - defines all available lifecycle hooks
 * that plugins can implement.
 */
export interface AppmorphPlugin {
  /** Unique plugin identifier */
  name: string;

  /**
   * Called during server startup. Use for plugin initialization.
   */
  onLoad?(): Promise<void>;

  /**
   * Extract user context from an incoming request.
   * First plugin to return a non-null value wins.
   */
  resolveUserContext?(req: FastifyRequest): Promise<UserContext | null>;

  /**
   * Authorize an action for a user.
   * Return { allowed: false } to deny, { allowed: true } to allow.
   * If no plugin handles auth, action is allowed by default.
   */
  authorize?(action: Action, ctx: AuthContext): Promise<AuthDecision>;

  /**
   * Called before the agent starts processing a task.
   * Return a VetoResult to prevent the agent from running.
   */
  beforeAgentRun?(ctx: TaskContext): Promise<void | VetoResult>;

  /**
   * Called after the agent completes (success or failure).
   */
  afterAgentRun?(ctx: TaskContext, result: AgentResult): Promise<void>;

  /**
   * Called before staging/preview deployment.
   */
  beforeStage?(ctx: StageContext): Promise<void | VetoResult>;

  /**
   * Called after staging completes.
   */
  afterStage?(ctx: StageContext, result: StageResult): Promise<void>;

  /**
   * Called before promoting to production or group.
   */
  beforePromote?(ctx: PromoteContext): Promise<void | VetoResult>;

  /**
   * Called after promotion completes.
   */
  afterPromote?(ctx: PromoteContext, result: PromoteResult): Promise<void>;

  /**
   * Called when a revert is triggered.
   */
  onRevert?(ctx: RevertContext): Promise<void>;

  /**
   * Called for audit logging. Plugins can forward events to external systems.
   */
  audit?(event: AuditEvent): Promise<void>;
}
