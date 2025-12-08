import { getTasksForNotification, TaskForNotification } from "./notion";
import { sendLine } from "./line";
import { NOTIFICATION_CONFIG, NOTIFICATION_HEADER } from "./config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

async function main() {
  // 環境変数チェック（GitHub ActionsのSecretsから渡される想定）
  requireEnv("NOTION_API_KEY");
  requireEnv("NOTION_DATABASE_ID");
  requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
  requireEnv("LINE_USER_ID");

  const tasks = await getTasksForNotification();

  if (tasks.length === 0) {
    console.log("No tasks to notify today.");
    return;
  }

  const lines = tasks.map((t: TaskForNotification) => {
    const prefix = NOTIFICATION_CONFIG[t.type].prefix;
    return `🔔 ${prefix} ${t.title}`;
  });

  const body = lines.join("\n");

  const message = `${NOTIFICATION_HEADER}\n\n${body}`;

  await sendLine(message);
}

main().catch((err) => {
  console.error("Notification job failed:", err);
  process.exitCode = 1;
});
