import type { WeeklyStatus } from "../types";
import { formatResetsIn } from "./format";

export function weeklyLines(weekly: WeeklyStatus | null): string[] {
  if (!weekly) return ["Resets in —"];
  const hasPercent = typeof weekly.usagePercent === "number";
  if (hasPercent) return [formatResetsIn(weekly.nextResetAt)];
  if (weekly.error) return ["Can't load weekly"];
  if (!weekly.signedIn) return ["Sign in to Grok Bot to see weekly"];
  const lines = ["No included weekly quota"];
  if (weekly.upgradeLabel) lines.push(weekly.upgradeLabel);
  return lines;
}
