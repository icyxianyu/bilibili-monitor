#!/usr/bin/env node
// dev.js - Smart dev launcher that finds available ports automatically
import { createServer } from 'net';
import { spawn } from 'child_process';

const PREFERRED_BACKEND_PORT = 3000;
const PREFERRED_FRONTEND_PORT = 3001;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(preferred, exclude = new Set()) {
  let port = preferred;
  while (exclude.has(port) || !(await isPortAvailable(port))) {
    if (!exclude.has(port)) {
      console.log(`[dev] Port ${port} is in use, trying ${port + 1}...`);
    }
    port++;
  }
  return port;
}

async function main() {
  const backendPort = await findAvailablePort(PREFERRED_BACKEND_PORT);
  const frontendPort = await findAvailablePort(PREFERRED_FRONTEND_PORT, new Set([backendPort]));

  if (backendPort !== PREFERRED_BACKEND_PORT) {
    console.log(`[dev] Backend: port ${PREFERRED_BACKEND_PORT} unavailable, using ${backendPort}`);
  }
  if (frontendPort !== PREFERRED_FRONTEND_PORT) {
    console.log(`[dev] Frontend: port ${PREFERRED_FRONTEND_PORT} unavailable, using ${frontendPort}`);
  }

  console.log(`[dev] Starting backend on :${backendPort}`);
  console.log(`[dev] Starting frontend on :${frontendPort}`);

  const backendEnv = {
    ...process.env,
    HTTP_PORT: String(backendPort),
    CORS_ORIGIN: `http://localhost:${frontendPort}`,
  };

  const frontendEnv = {
    ...process.env,
    NEXT_PUBLIC_BACKEND_URL: `http://localhost:${backendPort}`,
    BACKEND_URL: `http://localhost:${backendPort}`,
  };

  const backend = spawn(
    'pnpm',
    ['--filter', 'backend', 'dev'],
    { env: backendEnv, stdio: 'inherit', shell: true }
  );

  const frontend = spawn(
    'pnpm',
    ['--filter', 'web', 'exec', 'next', 'dev', '-p', String(frontendPort)],
    { env: frontendEnv, stdio: 'inherit', shell: true }
  );

  function shutdown() {
    backend.kill();
    frontend.kill();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  backend.on('exit', (code) => {
    console.log(`[dev] Backend exited (${code})`);
    frontend.kill();
    process.exit(code ?? 0);
  });

  frontend.on('exit', (code) => {
    console.log(`[dev] Frontend exited (${code})`);
    backend.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('[dev] Error:', err);
  process.exit(1);
});
