import { VersionsConfig, VersionMapping, VERSIONS_FILE } from '@appmorph/shared';

/**
 * Version mapping manager.
 * Phase 2 will implement file-based persistence in appmorph.versions.json.
 */

export interface VersionManager {
  load(repoPath: string): Promise<VersionsConfig>;
  save(repoPath: string, config: VersionsConfig): Promise<void>;
  getActiveVersion(config: VersionsConfig, groupId?: string): VersionMapping | null;
  setGroupVersion(config: VersionsConfig, mapping: VersionMapping): VersionsConfig;
  setProductionVersion(config: VersionsConfig, mapping: VersionMapping): VersionsConfig;
}

// In-memory stub for Phase 1
const defaultConfig: VersionsConfig = {
  production: null,
  groups: {},
};

export class FileVersionManager implements VersionManager {
  async load(repoPath: string): Promise<VersionsConfig> {
    // Phase 2: Read from `${repoPath}/${VERSIONS_FILE}`
    console.log(`[Stub] Would load versions from ${repoPath}/${VERSIONS_FILE}`);
    return { ...defaultConfig };
  }

  async save(repoPath: string, config: VersionsConfig): Promise<void> {
    // Phase 2: Write to `${repoPath}/${VERSIONS_FILE}`
    console.log(`[Stub] Would save versions to ${repoPath}/${VERSIONS_FILE}`, config);
  }

  getActiveVersion(config: VersionsConfig, groupId?: string): VersionMapping | null {
    if (groupId && config.groups[groupId]) {
      return config.groups[groupId];
    }
    return config.production;
  }

  setGroupVersion(config: VersionsConfig, mapping: VersionMapping): VersionsConfig {
    return {
      ...config,
      groups: {
        ...config.groups,
        [mapping.groupId]: mapping,
      },
    };
  }

  setProductionVersion(config: VersionsConfig, mapping: VersionMapping): VersionsConfig {
    return {
      ...config,
      production: mapping,
    };
  }
}

export function createVersionManager(): VersionManager {
  return new FileVersionManager();
}
