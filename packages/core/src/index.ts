import { config as dotenvConfig } from 'dotenv';

// Load .env file before other imports that may read env vars
dotenvConfig();

import { createServer } from './server/app.js';
import { getConfig, loadAppmorphProjectConfig } from './config/index.js';
import { initRepoManager } from './repo/index.js';
import { initStagingManager } from './staging/index.js';
import { initBuildManager } from './build/index.js';
import { initDeployManager } from './deploy/index.js';

const DEPLOY_SERVER_PORT = 3003;

async function main() {
  // Load and validate appmorph.json (mandatory, exits if missing)
  const projectConfig = loadAppmorphProjectConfig();

  // Load environment-based configuration
  const config = getConfig();

  // Initialize repo manager (using source_location from project config)
  const repoManager = initRepoManager(projectConfig.source_location);
  if (!repoManager.validate()) {
    console.error(`❌ Invalid source location: ${projectConfig.source_location}`);
    process.exit(1);
  }

  // Initialize staging, build, and deploy managers
  initStagingManager(projectConfig);
  initBuildManager(projectConfig);
  const deployManager = initDeployManager(projectConfig);

  const files = repoManager.listFiles();
  console.log('\n📦 Appmorph Core Configuration:');
  console.log(`   Source Location: ${projectConfig.source_location}`);
  console.log(`   Source Files: ${files.length} files`);
  console.log(`   Build Command: ${projectConfig.build_command}`);
  console.log(`   Deploy Root: ${projectConfig.deploy_root}`);
  console.log(`   Agent: ${config.agent.type} (${config.agent.command})`);
  console.log('');

  // Deploy the default app to the deploy root
  try {
    await deployManager.deployDefaultApp();
  } catch (err) {
    console.error(`⚠️  Failed to deploy default app: ${err}`);
  }

  // Start static file server for deployed apps
  try {
    await deployManager.startServer(DEPLOY_SERVER_PORT);
    console.log(`📁 Static file server running at http://localhost:${DEPLOY_SERVER_PORT}\n`);
  } catch (err) {
    console.error(`⚠️  Failed to start static file server: ${err}`);
    console.error('   Deployed apps will not be accessible via URL\n');
  }

  const server = await createServer();

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`🚀 Appmorph Core running at http://${config.host}:${config.port}\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
