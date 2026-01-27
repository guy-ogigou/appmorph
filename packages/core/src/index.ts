import { createServer } from './server/app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const server = await createServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`Appmorph Core running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
