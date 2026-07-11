import { FastifyInstance, FastifyRequest } from 'fastify';
import { config } from '../config';
import { db } from '../db';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number; type: string };
    from: { id: number; username?: string; first_name: string };
    text?: string;
    date: number;
  };
}

export async function telegramRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /webhook/telegram
   *
   * Receives updates from the Telegram Bot API.
   * Telegram POSTs here whenever a user sends a message to the bot.
   *
   * Security: Validates `X-Telegram-Bot-Api-Secret-Token` header against
   * TELEGRAM_WEBHOOK_SECRET env var. Reject all requests without it.
   *
   * Supported bot commands:
   *   /start  → welcome message + instructions
   *   /link <stellar_address>  → links Telegram chat_id to a wallet address
   *   /unlink  → removes the Telegram subscription
   *   /status  → shows current alert subscription status
   */
  fastify.post(
    '/webhook/telegram',
    async (request: FastifyRequest, reply) => {

      // Validate Telegram webhook secret — reject if not configured or mismatched
      const secret = request.headers['x-telegram-bot-api-secret-token'];
      if (!config.TELEGRAM_WEBHOOK_SECRET || secret !== config.TELEGRAM_WEBHOOK_SECRET) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const update = request.body as TelegramUpdate;
      const message = update.message;

      // Ignore non-message updates (edited messages, etc.)
      if (!message?.text) {
        return reply.send({ ok: true });
      }

      const chatId  = message.chat.id.toString();
      const text    = message.text.trim();
      const [command, ...args] = text.split(' ');

      const BOT_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

      async function sendReply(msg: string): Promise<void> {
        await fetch(`${BOT_API}/sendMessage`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id:    chatId,
            text:       msg,
            parse_mode: 'MarkdownV2',
          }),
        });
      }

      switch (command.toLowerCase()) {
        case '/start':
          await sendReply(
            '👋 Welcome to *RAW\\$*\\!\n\n' +
            'Your yield\\. Exposed\\.\n\n' +
            'Use `/link YOUR_STELLAR_ADDRESS` to receive pool health alerts here\\.\n' +
            'Example: `/link GABCDE...`'
          );
          break;

        case '/link': {
          const stellarAddress = args[0];
          if (!stellarAddress || !/^G[A-Z2-7]{55}$/.test(stellarAddress)) {
            await sendReply('❌ Invalid Stellar address\\. Must start with G and be 56 characters\\.');
            break;
          }

          const { error } = await db
            .from('user_preferences')
            .upsert(
              {
                user_address:      stellarAddress,
                telegram_chat_id:  chatId,
                updated_at:        new Date().toISOString(),
              },
              { onConflict: 'user_address' }
            );

          if (error) {
            await sendReply('❌ Database error\\. Please try again\\.');
          } else {
            await sendReply(
              `✅ Linked\\! Address \`${stellarAddress.slice(0, 6)}\\.\\.\\.\` will now receive pool alerts here\\.`
            );
          }
          break;
        }

        case '/unlink': {
          await db
            .from('user_preferences')
            .update({ telegram_chat_id: null })
            .eq('telegram_chat_id', chatId);
          await sendReply('✅ Unlinked\\. You will no longer receive alerts here\\.');
          break;
        }

        case '/status': {
          const { data } = await db
            .from('user_preferences')
            .select('user_address')
            .eq('telegram_chat_id', chatId)
            .limit(1);

          if (data && data.length > 0) {
            const addr = (data[0] as { user_address: string }).user_address;
            await sendReply(`✅ Linked to \`${addr.slice(0, 6)}\\.\\.\\.\`\\. Alerts are active\\.`);
          } else {
            await sendReply('❌ No wallet linked\\. Use `/link YOUR_STELLAR_ADDRESS`\\.');
          }
          break;
        }

        default:
          await sendReply('Unknown command\\. Use `/start` for help\\.');
      }

      return reply.send({ ok: true });
    }
  );
}
