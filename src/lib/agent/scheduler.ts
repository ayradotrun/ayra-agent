import type { ScheduleInterval } from "@prisma/client";

export function scheduleToCron(schedule: ScheduleInterval): string | null {
  switch (schedule) {
    case "EVERY_5_MIN":
      return "*/5 * * * *";
    case "EVERY_15_MIN":
      return "*/15 * * * *";
    case "HOURLY":
      return "0 * * * *";
    case "DAILY":
      return "0 9 * * *";
    case "MANUAL":
    default:
      return null;
  }
}

export function scheduleLabel(schedule: ScheduleInterval): string {
  switch (schedule) {
    case "EVERY_5_MIN":
      return "Every 5 min";
    case "EVERY_15_MIN":
      return "Every 15 min";
    case "HOURLY":
      return "Hourly";
    case "DAILY":
      return "Daily";
    case "MANUAL":
    default:
      return "Manual";
  }
}

export function getNextRunTime(schedule: ScheduleInterval, from = new Date()): Date | null {
  const cron = scheduleToCron(schedule);
  if (!cron) return null;

  const next = new Date(from);
  switch (schedule) {
    case "EVERY_5_MIN":
      next.setMinutes(next.getMinutes() + 5);
      break;
    case "EVERY_15_MIN":
      next.setMinutes(next.getMinutes() + 15);
      break;
    case "HOURLY":
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
      break;
    case "DAILY":
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      break;
  }
  return next;
}
