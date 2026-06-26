import { config } from '../config';

const TELEGRAM_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export interface TelegramAlert {
  chat_id:  string;   // user's Telegram chat ID (stored in alerts table)
  pool_id:  string;
  ney:      number;
  suggested_pool?: string;
  alert_type: 'RED_CRITICAL' | 'YELLOW_WARNING' | 'COMPOUND';
}

/**
 * Send a formatted alert message to a user's Telegram chat.
 * Uses Telegram Bot API sendMessage endpoint — completely free, no rate limits
 * for low-volume usage.
 */
export async function sendTelegramAlert(alert: TelegramAlert): Promise<boolean> {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not set — skipping Telegram notification');
    return false;
  }

  const emoji = alert.alert_type === 'RED_CRITICAL' ? '🔴' :
                alert.alert_type === 'YELLOW_WARNING' ? '🟡' : '🟢';

  const neyFormatted = (alert.ney * 100).toFixed(2);

  const text = alert.alert_type === 'RED_CRITICAL'
    ? `${emoji} *RAW\\$ Pool Alert*\n\n` +
      `Pool \`${escapeMarkdown(alert.pool_id)}\` has been losing money for 90 minutes\\.\n\n` +
      `📉 Net Effective Yield: *${neyFormatted}%*\n` +
      (alert.suggested_pool
        ? `\n✅ Suggested move: \`${escapeMarkdown(alert.suggested_pool)}\`\n`
        : '') +
      `\nOpen RAW\\$ to exit in one tap\\.`
    : alert.alert_type === 'COMPOUND'
    ? `${emoji} *RAW\\$ Auto\\-Compounded*\n\nYour rewards in \`${escapeMarkdown(alert.pool_id)}\` were harvested and reinvested\\.`
    : `${emoji} *RAW\\$ Warning*\n\nPool \`${escapeMarkdown(alert.pool_id)}\` NEY is approaching zero\\. Monitoring closely\\.`;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    alert.chat_id,
        text,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Telegram API error: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Telegram send failed:', err);
    return false;
  }
}

/** Escape special chars for Telegram MarkdownV2 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Register the webhook URL with Telegram so Telegram POSTs updates to our server.
 * Call once on startup if TELEGRAM_BOT_TOKEN is set.
 */
export async function registerTelegramWebhook(webhookUrl: string): Promise<void> {
  if (!config.TELEGRAM_BOT_TOKEN) return;

  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:          webhookUrl,
      secret_token: config.TELEGRAM_WEBHOOK_SECRET ?? '',
      allowed_updates: ['message'],
    }),
  });
  const json = await res.json() as { ok: boolean; description?: string };
  if (json.ok) {
    console.log('✅ Telegram webhook registered');
  } else {
    console.warn('⚠️  Telegram webhook registration failed:', json.description);
  }
}
