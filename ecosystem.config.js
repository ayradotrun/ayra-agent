module.exports = {
  apps: [
    {
      name: "ayra-agent-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ayra-agent-worker",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/workers/agent-worker.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ayra-agent-memory",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/agentmemory-server.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
