/**
 * GitHub Actions での自動実行を有効にするかどうか
 *
 * このリポジトリは公開用のため、デフォルトでは false に設定されています。
 * フォークして利用する場合は、以下の手順で自動実行を有効化してください：
 *
 * 1. この値を true に変更
 * 2. .github/workflows/notify-tasks.yml の schedule のコメントを外す
 * 3. GitHub の Repository Settings → Secrets and variables → Actions で必要なシークレットを設定
 */
export const ENABLE_AUTO_RUN = true;

export type NotificationType = "today" | "2days";

export interface NotificationConfigItem {
  offsetDays: number;
  prefix: string;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfigItem> = {
  today: {
    offsetDays: 0,
    prefix: "[当日]",
  },
  "2days": {
    offsetDays: 2,
    prefix: "[2日前]",
  },
};

export const NOTIFICATION_HEADER =
  "本日および2日後が締切（またはリスケ日）のタスクは以下です。";

/* 通知時刻（JST） */
export const NOTIFICATION_TIME_JST = {
  hour: 19,
  minute: 0,
};
