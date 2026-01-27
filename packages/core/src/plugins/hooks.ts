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
import { getPluginLoader } from './loader.js';
import { AppmorphPlugin } from './types.js';

/**
 * HookRunner - Executes plugin hooks in sequence.
 */
export class HookRunner {
  private get plugins(): AppmorphPlugin[] {
    return getPluginLoader().getPlugins();
  }

  /**
   * Resolve user context from request.
   * First plugin to return a non-null value wins.
   */
  async resolveUserContext(req: FastifyRequest): Promise<UserContext | null> {
    for (const plugin of this.plugins) {
      if (plugin.resolveUserContext) {
        const ctx = await plugin.resolveUserContext(req);
        if (ctx) return ctx;
      }
    }
    return null;
  }

  /**
   * Check if an action is authorized.
   * Returns denied if any plugin explicitly denies.
   * Returns allowed if any plugin explicitly allows.
   * Returns allowed by default if no plugin handles it.
   */
  async authorize(action: Action, ctx: AuthContext): Promise<AuthDecision> {
    for (const plugin of this.plugins) {
      if (plugin.authorize) {
        const decision = await plugin.authorize(action, ctx);
        if (!decision.allowed) {
          return decision; // Explicit deny takes precedence
        }
      }
    }
    return { allowed: true };
  }

  /**
   * Run beforeAgentRun hooks.
   * Returns a veto if any plugin vetoes.
   */
  async beforeAgentRun(ctx: TaskContext): Promise<VetoResult | null> {
    for (const plugin of this.plugins) {
      if (plugin.beforeAgentRun) {
        const result = await plugin.beforeAgentRun(ctx);
        if (result && 'vetoed' in result) {
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Run afterAgentRun hooks (all plugins, no short-circuit).
   */
  async afterAgentRun(ctx: TaskContext, result: AgentResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterAgentRun) {
        await plugin.afterAgentRun(ctx, result);
      }
    }
  }

  /**
   * Run beforeStage hooks.
   */
  async beforeStage(ctx: StageContext): Promise<VetoResult | null> {
    for (const plugin of this.plugins) {
      if (plugin.beforeStage) {
        const result = await plugin.beforeStage(ctx);
        if (result && 'vetoed' in result) {
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Run afterStage hooks.
   */
  async afterStage(ctx: StageContext, result: StageResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterStage) {
        await plugin.afterStage(ctx, result);
      }
    }
  }

  /**
   * Run beforePromote hooks.
   */
  async beforePromote(ctx: PromoteContext): Promise<VetoResult | null> {
    for (const plugin of this.plugins) {
      if (plugin.beforePromote) {
        const result = await plugin.beforePromote(ctx);
        if (result && 'vetoed' in result) {
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Run afterPromote hooks.
   */
  async afterPromote(ctx: PromoteContext, result: PromoteResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterPromote) {
        await plugin.afterPromote(ctx, result);
      }
    }
  }

  /**
   * Run onRevert hooks.
   */
  async onRevert(ctx: RevertContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onRevert) {
        await plugin.onRevert(ctx);
      }
    }
  }

  /**
   * Run audit hooks (fire and forget, errors logged but not thrown).
   */
  async audit(event: AuditEvent): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.audit) {
        try {
          await plugin.audit(event);
        } catch (error) {
          console.error(`Audit hook failed for plugin:`, error);
        }
      }
    }
  }
}

// Singleton instance
let runnerInstance: HookRunner | null = null;

export function getHookRunner(): HookRunner {
  if (!runnerInstance) {
    runnerInstance = new HookRunner();
  }
  return runnerInstance;
}
