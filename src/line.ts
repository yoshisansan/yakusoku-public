function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

const lineChannelAccessToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
const lineUserId = requireEnv("LINE_USER_ID");

export async function sendLine(text: string): Promise<void> {
  const LINE_API = "https://api.line.me/v2/bot/message/push";

  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lineChannelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send LINE message: ${res.status} ${res.statusText} - ${errorText}`);
  }
}
