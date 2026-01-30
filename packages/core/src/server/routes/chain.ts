import { FastifyInstance } from 'fastify';
import {
  API_ROUTES,
  ChainResponse,
  ChainEntry,
  RollbackRequest,
  RollbackResponse,
} from '@appmorph/shared';
import { getTaskPersistence } from '../../persistence/index.js';
import { getStagingManager } from '../../staging/index.js';
import { getDeployManager } from '../../deploy/index.js';

export async function registerChainRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/chain - Get user's chain
  fastify.get(API_ROUTES.CHAIN, async (request, _reply): Promise<ChainResponse> => {
    const appmorphUserId = (request.headers['x-appmorph-user-id'] as string) || 'anonymous';
    const persistence = getTaskPersistence();

    const chain = persistence.getUserChain(appmorphUserId);
    const latest = chain.length > 0 ? chain[chain.length - 1] : null;

    const chainEntries: ChainEntry[] = chain.map((entry, index) => ({
      session_id: entry.session_id,
      prompt: entry.prompt,
      created_at: entry.created_at,
      created_date: entry.created_date,
      chain_position: entry.chain_position,
      is_current: index === chain.length - 1,
    }));

    return {
      user_id: appmorphUserId,
      chain: chainEntries,
      current_session_id: latest?.session_id || null,
    };
  });

  // POST /api/chain/rollback - Rollback to a specific version
  fastify.post<{ Body: RollbackRequest; Reply: RollbackResponse }>(
    API_ROUTES.CHAIN_ROLLBACK,
    async (request, _reply): Promise<RollbackResponse> => {
      const { target_session_id } = request.body;
      const appmorphUserId = (request.headers['x-appmorph-user-id'] as string) || 'anonymous';
      const persistence = getTaskPersistence();

      // Special case: reset to original (delete all entries)
      if (target_session_id === '__reset_to_original__') {
        console.log(`[Chain] Resetting user ${appmorphUserId} to original state`);

        const chain = persistence.getUserChain(appmorphUserId);
        const allSessionIds = chain.map((e) => e.session_id);

        // Mark all entries as rolled back
        persistence.rollbackToPosition(appmorphUserId, -1); // -1 means all entries

        // Clean up filesystem
        try {
          const stagingManager = getStagingManager();
          const deployManager = getDeployManager();

          for (const sessionId of allSessionIds) {
            console.log(`[Chain] Cleaning up session ${sessionId}`);
            stagingManager.cleanupStage(sessionId);
            deployManager.cleanupDeploy(sessionId);
          }
        } catch (error) {
          console.error(`[Chain] Filesystem cleanup error: ${error}`);
        }

        // Delete all entries from persistence
        persistence.deleteRolledBackEntries(appmorphUserId);

        console.log(`[Chain] Reset complete. Removed ${allSessionIds.length} entries`);

        return {
          success: true,
          removed_sessions: allSessionIds,
          current_session_id: null,
        };
      }

      // Find target entry
      const targetEntry = persistence.getTaskBySessionId(target_session_id);
      if (!targetEntry || targetEntry.appmorph_user_id !== appmorphUserId) {
        return {
          success: false,
          removed_sessions: [],
          current_session_id: null,
          error: 'Target session not found or access denied',
        };
      }

      if (targetEntry.status !== 'active') {
        return {
          success: false,
          removed_sessions: [],
          current_session_id: null,
          error: 'Target session is not active',
        };
      }

      console.log(
        `[Chain] Rolling back user ${appmorphUserId} to position ${targetEntry.chain_position} (session: ${target_session_id})`
      );

      // Mark entries after target as rolled back
      const rolledBack = persistence.rollbackToPosition(appmorphUserId, targetEntry.chain_position);
      const rolledBackIds = rolledBack.map((e) => e.session_id);

      console.log(`[Chain] Marked ${rolledBackIds.length} entries as rolled back`);

      // Clean up filesystem
      try {
        const stagingManager = getStagingManager();
        const deployManager = getDeployManager();

        for (const sessionId of rolledBackIds) {
          console.log(`[Chain] Cleaning up session ${sessionId}`);
          stagingManager.cleanupStage(sessionId);
          deployManager.cleanupDeploy(sessionId);
        }
      } catch (error) {
        console.error(`[Chain] Filesystem cleanup error: ${error}`);
        // Continue even if cleanup fails
      }

      // Delete rolled back entries from persistence
      persistence.deleteRolledBackEntries(appmorphUserId);

      console.log(`[Chain] Rollback complete. Current session: ${target_session_id}`);

      return {
        success: true,
        removed_sessions: rolledBackIds,
        current_session_id: target_session_id,
      };
    }
  );
}
