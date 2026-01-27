import { FastifyInstance } from 'fastify';
import {
  API_ROUTES,
  PromoteRequest,
  PromoteResponse,
  RevertRequest,
  RevertResponse,
  VersionsConfig,
} from '@appmorph/shared';

// In-memory version store (would be replaced with file-based in Phase 2)
let versionsConfig: VersionsConfig = {
  production: null,
  groups: {},
};

export async function registerVersionRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current version mappings
  fastify.get(API_ROUTES.VERSION, async () => {
    return versionsConfig;
  });

  // Promote a version
  fastify.post<{ Body: PromoteRequest; Reply: PromoteResponse }>(
    API_ROUTES.PROMOTE,
    async (request, _reply) => {
      const { groupId, commitSha, toProduction } = request.body;
      const userId = request.headers['x-user-id'] as string || 'anonymous';

      const mapping = {
        groupId,
        commitSha,
        deployedAt: Date.now(),
        deployedBy: userId,
      };

      if (toProduction) {
        versionsConfig.production = mapping;
      } else {
        versionsConfig.groups[groupId] = mapping;
      }

      // In Phase 3, this would trigger actual deployment via plugins
      return {
        success: true,
        previewUrl: toProduction ? undefined : `https://preview-${groupId}.appmorph.dev`,
        productionUrl: toProduction ? 'https://app.example.com' : undefined,
      };
    }
  );

  // Revert to a previous version
  fastify.post<{ Body: RevertRequest; Reply: RevertResponse }>(
    API_ROUTES.REVERT,
    async (request, reply) => {
      const { groupId, toCommitSha } = request.body;

      if (groupId) {
        // Revert group version
        const current = versionsConfig.groups[groupId];
        if (!current) {
          reply.status(404);
          return { success: false, revertedTo: '' };
        }

        // In Phase 3, would look up previous version from history
        versionsConfig.groups[groupId] = {
          ...current,
          commitSha: toCommitSha || 'previous-sha',
          deployedAt: Date.now(),
        };

        return { success: true, revertedTo: toCommitSha || 'previous-sha' };
      } else {
        // Revert production
        if (!versionsConfig.production) {
          reply.status(404);
          return { success: false, revertedTo: '' };
        }

        versionsConfig.production = {
          ...versionsConfig.production,
          commitSha: toCommitSha || 'previous-sha',
          deployedAt: Date.now(),
        };

        return { success: true, revertedTo: toCommitSha || 'previous-sha' };
      }
    }
  );
}
