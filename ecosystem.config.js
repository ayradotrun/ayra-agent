const path = require("path");

/** PM2 production config — run from repo root: pm2 start ecosystem.config.js */
module.exports = {
  apps: [
    {
      name: "ayra-agent-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      exec_mode: "fork",
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
      cwd: __dirname,
      script: "npm",
      args: "run worker",
      exec_mode: "fork",
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
      cwd: __dirname,
      script: "npm",
      args: "run agentmemory",
      exec_mode: "fork",
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
