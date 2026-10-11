declare module "@analytics/google-analytics" {
  import type { AnalyticsPlugin } from "analytics";
  export function init(options: { measurementIds: string[] }): AnalyticsPlugin;
}
