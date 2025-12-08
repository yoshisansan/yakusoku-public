import { addDays, isSameDay } from "date-fns";
import {
  NOTIFICATION_CONFIG,
  NotificationConfigItem,
  NotificationType,
} from "./config";

export interface TaskForNotification {
  title: string;
  type: NotificationType;
}

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const TITLE_PROPERTY = "タスク名";
const DUE_PROPERTY = "締切日";
const RESCHEDULE_PROPERTY = "リスケ日";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

const notionApiKey = requireEnv("NOTION_API_KEY");
const databaseId = requireEnv("NOTION_DATABASE_ID");

function parseDateProperty(prop: any): Date | null {
  const start = prop?.date?.start;
  if (!start) return null;
  const d = new Date(start);
  return isNaN(d.getTime()) ? null : d;
}

export async function getTasksForNotification(): Promise<TaskForNotification[]> {
  const today = new Date();

  const pages: any[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const body: any = {
      page_size: 100,
      filter: {
        or: [
          {
            property: DUE_PROPERTY,
            date: { is_not_empty: true },
          },
          {
            property: RESCHEDULE_PROPERTY,
            date: { is_not_empty: true },
          },
        ],
      },
    };

    if (cursor) {
      body.start_cursor = cursor;
    }

    const res = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to query Notion database: ${res.status} ${res.statusText} - ${text}`);
    }

    const data = await res.json();
    pages.push(...(data.results ?? []));
    hasMore = data.has_more ?? false;
    cursor = data.next_cursor ?? undefined;
  }

  const tasks: TaskForNotification[] = [];

  for (const page of pages) {
    const props = page.properties ?? {};

    const titleProp = props[TITLE_PROPERTY] ?? props["Name"];
    const titleText: string =
      titleProp?.title?.[0]?.plain_text ?? "(無題)";

    const due = parseDateProperty(props[DUE_PROPERTY]);
    const rescheduled = parseDateProperty(props[RESCHEDULE_PROPERTY]);

    if (!due && !rescheduled) {
      continue;
    }

    let notificationDate: Date | null = null;

    if (rescheduled && due && rescheduled > due) {
      notificationDate = rescheduled;
    } else if (rescheduled && !due) {
      notificationDate = rescheduled;
    } else if (due) {
      notificationDate = due;
    }

    if (!notificationDate) continue;

    let type: NotificationType | null = null;

    for (const [notificationType, config] of Object.entries(
      NOTIFICATION_CONFIG,
    ) as [NotificationType, NotificationConfigItem][]) {
      const targetDate = addDays(today, config.offsetDays);
      if (isSameDay(notificationDate, targetDate)) {
        type = notificationType;
        break;
      }
    }

    if (!type) continue;

    tasks.push({
      title: titleText,
      type,
    });
  }

  return tasks;
}
