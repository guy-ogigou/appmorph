import { PluginConfig } from '@appmorph/shared';
import { AppmorphPlugin } from './types.js';

/**
 * PluginLoader - Loads and manages plugins from configuration.
 */
export class PluginLoader {
  private plugins: AppmorphPlugin[] = [];

  /**
   * Load plugins from configuration.
   * In Phase 1, this is a stub that just logs the config.
   * In Phase 2, it will dynamically import plugins.
   */
  async loadPlugins(configs: PluginConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        const plugin = await this.loadPlugin(config);
        if (plugin) {
          this.plugins.push(plugin);
          console.log(`Loaded plugin: ${plugin.name}`);

          // Call onLoad hook if defined
          if (plugin.onLoad) {
            await plugin.onLoad();
          }
        }
      } catch (error) {
        console.error(`Failed to load plugin ${config.name}:`, error);
      }
    }
  }

  private async loadPlugin(config: PluginConfig): Promise<AppmorphPlugin | null> {
    // In Phase 2, this would dynamically import the plugin:
    // const module = await import(config.path || config.name);
    // return module.default || module.createPlugin(config.options);

    // For Phase 1, return a stub plugin
    console.log(`Plugin loading stubbed for: ${config.name}`);
    return null;
  }

  /**
   * Get all loaded plugins.
   */
  getPlugins(): AppmorphPlugin[] {
    return [...this.plugins];
  }

  /**
   * Register a plugin directly (useful for built-in plugins).
   */
  registerPlugin(plugin: AppmorphPlugin): void {
    this.plugins.push(plugin);
  }
}

// Singleton instance
let loaderInstance: PluginLoader | null = null;

export function getPluginLoader(): PluginLoader {
  if (!loaderInstance) {
    loaderInstance = new PluginLoader();
  }
  return loaderInstance;
}
