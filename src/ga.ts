import { init as Analytics } from "analytics";
import { init as googleAnalytics } from "@analytics/google-analytics";

const analytics = Analytics({
  app: "_stc_",
  plugins: [
    googleAnalytics({
      measurementIds: ["G-WZVNL8C7N5"],
    }),
  ],
});

/**
 * 跟踪自定义事件
 * @param event - 事件名称
 * @param data - 可选的事件数据对象
 */
export const trackEvent = (event: string, data?: Record<string, unknown>) => {
  analytics.track(event, data)
};
