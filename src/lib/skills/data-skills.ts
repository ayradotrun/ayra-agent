import { z } from "zod";
import type { SkillDefinition } from "./base";
import { parseCsv, runLlm } from "./helpers";
import { prisma } from "@/lib/prisma";

export const csvReader: SkillDefinition = {
  id: "csv-reader",
  name: "CSV Reader",
  slug: "csv-reader",
  category: "Data",
  description: "Read and parse CSV text content.",
  icon: "table",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    content: z.string().min(1).describe("CSV file content"),
    maxRows: z.number().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Parsing CSV", "csv-reader");
    const { headers, rows } = parseCsv(input.content);
    const limit = input.maxRows ?? 50;
    return { headers, rows: rows.slice(0, limit), totalRows: rows.length, ok: true };
  },
};

export const excelReader: SkillDefinition = {
  id: "excel-reader",
  name: "Excel Reader",
  slug: "excel-reader",
  category: "Data",
  description: "Parse tab-separated or CSV-style spreadsheet text.",
  icon: "sheet",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    content: z.string().min(1).describe("Paste TSV/CSV export from Excel"),
    delimiter: z.enum(["tab", "comma"]).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Parsing spreadsheet text", "excel-reader");
    const delimiter = input.delimiter === "tab" ? "\t" : ",";
    const normalized = delimiter === "\t" ? input.content.replace(/\t/g, ",") : input.content;
    const { headers, rows } = parseCsv(normalized);
    return { headers, rows: rows.slice(0, 50), totalRows: rows.length, format: input.delimiter || "comma", ok: true };
  },
};

export const databaseQuery: SkillDefinition = {
  id: "database-query",
  name: "Database Query",
  slug: "database-query",
  category: "Data",
  description: "Query agent memories and recent runs (read-only).",
  icon: "database",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query for memories or runs"),
    type: z.enum(["memories", "runs", "both"]).optional(),
    limit: z.number().optional(),
  }),
  async execute(input, ctx) {
    const limit = input.limit ?? 10;
    await ctx.log("INFO", `DB query: ${input.query}`, "database-query");
    const type = input.type ?? "both";

    const memories =
      type !== "runs"
        ? await prisma.agentMemory.findMany({
            where: {
              agentId: ctx.agentId,
              content: { contains: input.query, mode: "insensitive" },
            },
            take: limit,
            orderBy: { createdAt: "desc" },
          })
        : [];

    const runs =
      type !== "memories"
        ? await prisma.agentRun.findMany({
            where: {
              agentId: ctx.agentId,
              OR: [
                { summary: { contains: input.query, mode: "insensitive" } },
                { output: { contains: input.query, mode: "insensitive" } },
              ],
            },
            take: limit,
            orderBy: { startedAt: "desc" },
            select: { id: true, status: true, summary: true, startedAt: true },
          })
        : [];

    return {
      query: input.query,
      memories: memories.map((m) => ({ id: m.id, content: m.content.slice(0, 200) })),
      runs,
      ok: memories.length > 0 || runs.length > 0,
    };
  },
};

export const reportGenerator: SkillDefinition = {
  id: "report-generator",
  name: "Report Generator",
  slug: "report-generator",
  category: "Data",
  description: "Generate a structured report from data.",
  icon: "file-bar-chart",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    title: z.string().min(1),
    data: z.string().min(1).describe("Data or notes to include in the report"),
    format: z.enum(["summary", "detailed", "executive"]).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Report: ${input.title}`, "report-generator");
    const report = await runLlm(
      ctx.userId,
      `Generate a ${input.format || "summary"} report in markdown. Use sections: Overview, Key Findings, Recommendations.`,
      `Title: ${input.title}\n\nData:\n${input.data.slice(0, 6000)}`
    );
    return { title: input.title, report, ok: true };
  },
};

export const chartGenerator: SkillDefinition = {
  id: "chart-generator",
  name: "Chart Generator",
  slug: "chart-generator",
  category: "Data",
  description: "Generate chart configuration from data (Chart.js compatible JSON).",
  icon: "bar-chart-3",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    title: z.string().min(1),
    data: z.string().min(1).describe("Data description or CSV snippet"),
    chartType: z.enum(["bar", "line", "pie", "doughnut"]).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Chart: ${input.title}`, "chart-generator");
    const raw = await runLlm(
      ctx.userId,
      "Output Chart.js config JSON only: { type, data: { labels, datasets }, options }",
      `Title: ${input.title}\nType: ${input.chartType || "bar"}\nData:\n${input.data.slice(0, 3000)}`
    );
    let config: unknown = { raw };
    try {
      config = JSON.parse(raw.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      /* keep raw */
    }
    return { title: input.title, chartConfig: config, ok: true };
  },
};
