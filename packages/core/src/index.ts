import { createServer } from './server/app.js';
import { getConfig } from './config/index.js';
import { initRepoManager } from './repo/index.js';

async function main() {
  // Load and validate configuration (exits if invalid)
  const config = getConfig();

  // Initialize repo manager
  const repoManager = initRepoManager(config.projectPath);
  if (!repoManager.validate()) {
    console.error(`❌ Invalid project path: ${config.projectPath}`);
    process.exit(1);
  }

  const files = repoManager.listFiles();
  console.log('\n📦 Appmorph Core Configuration:');
  console.log(`   Project Path: ${config.projectPath}`);
  console.log(`   Project Files: ${files.length} files`);
  console.log(`   Agent: ${config.agent.type} (${config.agent.command})`);
  console.log('');

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
