import os from "os";
import fs from "fs";
import { z } from "zod";
import type { SkillDefinition } from "./base";
import { fetchText } from "./helpers";

function hostMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const load = os.loadavg();
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    uptimeSeconds: os.uptime(),
    cpuCount: os.cpus().length,
    loadAvg: load,
    memory: {
      totalGb: +(totalMem / 1e9).toFixed(2),
      usedGb: +(usedMem / 1e9).toFixed(2),
      usedPercent: +((usedMem / totalMem) * 100).toFixed(1),
    },
  };
}

export const vpsMonitor: SkillDefinition = {
  id: "vps-monitor",
  name: "VPS Monitor",
  slug: "vps-monitor",
  category: "DevOps",
  description: "Monitor host health on the server running AYRA.",
  icon: "server",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    metricsUrl: z.string().url().optional().describe("Optional remote metrics JSON URL"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "VPS health check", "vps-monitor");
    if (input.metricsUrl) {
      const remote = await fetch(input.metricsUrl).then((r) => r.json());
      return { source: "remote", metrics: remote, ok: true };
    }
    const metrics = hostMetrics();
    const healthy = metrics.memory.usedPercent < 90 && metrics.loadAvg[0] < metrics.cpuCount * 2;
    return { source: "host", metrics, healthy, ok: true };
  },
};

export const cpuMonitor: SkillDefinition = {
  id: "cpu-monitor",
  name: "CPU Monitor",
  slug: "cpu-monitor",
  category: "DevOps",
  description: "Track CPU load on the AYRA host.",
  icon: "cpu",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await ctx.log("INFO", "CPU check", "cpu-monitor");
    const m = hostMetrics();
    const load = m.loadAvg[0];
    const status = load > m.cpuCount * 2 ? "critical" : load > m.cpuCount ? "warning" : "ok";
    return { cpuCount: m.cpuCount, load1m: load, load5m: m.loadAvg[1], status, ok: status !== "critical" };
  },
};

export const ramMonitor: SkillDefinition = {
  id: "ram-monitor",
  name: "RAM Monitor",
  slug: "ram-monitor",
  category: "DevOps",
  description: "Track memory usage on the AYRA host.",
  icon: "memory-stick",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await ctx.log("INFO", "RAM check", "ram-monitor");
    const m = hostMetrics();
    const status = m.memory.usedPercent > 90 ? "critical" : m.memory.usedPercent > 75 ? "warning" : "ok";
    return { ...m.memory, status, ok: status !== "critical" };
  },
};

export const diskMonitor: SkillDefinition = {
  id: "disk-monitor",
  name: "Disk Monitor",
  slug: "disk-monitor",
  category: "DevOps",
  description: "Check disk usage on the AYRA host (cwd volume).",
  icon: "hard-drive",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    path: z.string().optional().describe("Path to check, default cwd"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Disk check", "disk-monitor");
    const target = input.path || process.cwd();
    try {
      fs.accessSync(target);
      const stats = fs.statfsSync?.(target) as { bsize: number; blocks: number; bavail: number } | undefined;
      if (stats) {
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bavail;
        const usedPercent = +(((total - free) / total) * 100).toFixed(1);
        return { path: target, totalGb: +(total / 1e9).toFixed(2), usedPercent, ok: usedPercent < 90 };
      }
    } catch {
      /* fallback below */
    }
    return { path: target, note: "Detailed disk stats unavailable on this platform", ok: true };
  },
};

export const pm2Monitor: SkillDefinition = {
  id: "pm2-monitor",
  name: "PM2 Monitor",
  slug: "pm2-monitor",
  category: "DevOps",
  description: "Check PM2 status via HTTP metrics endpoint.",
  icon: "activity",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    statusUrl: z.string().url().optional().describe("PM2 or process status JSON URL"),
  }),
  async execute(input, ctx) {
    const url = input.statusUrl || process.env.PM2_STATUS_URL;
    if (!url) {
      return { ok: false, error: "Set statusUrl or PM2_STATUS_URL env var" };
    }
    await ctx.log("INFO", `PM2 check: ${url}`, "pm2-monitor");
    const data = await fetch(url).then((r) => r.json());
    return { url, processes: data, ok: true };
  },
};

export const nginxMonitor: SkillDefinition = {
  id: "nginx-monitor",
  name: "Nginx Monitor",
  slug: "nginx-monitor",
  category: "DevOps",
  description: "Check Nginx stub_status or health endpoint.",
  icon: "globe",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    statusUrl: z.string().url().optional(),
  }),
  async execute(input, ctx) {
    const url = input.statusUrl || process.env.NGINX_STATUS_URL;
    if (!url) {
      return { ok: false, error: "Set statusUrl or NGINX_STATUS_URL env var" };
    }
    await ctx.log("INFO", `Nginx check: ${url}`, "nginx-monitor");
    const text = await fetchText(url);
    return { url, status: text.slice(0, 500), ok: true };
  },
};

export const dockerMonitor: SkillDefinition = {
  id: "docker-monitor",
  name: "Docker Monitor",
  slug: "docker-monitor",
  category: "DevOps",
  description: "Check Docker remote API or health endpoint.",
  icon: "container",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    healthUrl: z.string().url().optional(),
  }),
  async execute(input, ctx) {
    const url = input.healthUrl || process.env.DOCKER_HEALTH_URL;
    if (!url) {
      return { ok: false, error: "Set healthUrl or DOCKER_HEALTH_URL env var" };
    }
    await ctx.log("INFO", `Docker check: ${url}`, "docker-monitor");
    const response = await fetch(url);
    const body = await response.text();
    return { url, status: response.status, body: body.slice(0, 500), ok: response.ok };
  },
};
