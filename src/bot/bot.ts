import { Bot, webhookCallback } from 'grammy';
import { env } from '../config/env';
import { handle_start, handle_linking_input } from './commands/start';
import { handle_help } from './commands/help';
import { handle_accounts } from './commands/accounts';
import { handle_status } from './commands/status';
import { handle_post, handle_post_callback, handle_post_message } from './commands/post';
import { get_session, clear_session } from './session';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Command handlers
bot.command('start', handle_start);
bot.command('help', handle_help);
bot.command('accounts', handle_accounts);
bot.command('status', handle_status);
bot.command('post', handle_post);
bot.command('cancel', async (ctx) => {
  await clear_session(ctx.chat!.id);
  await ctx.reply('Cancelled. Use /post to start again.');
});

// Handle callback queries (inline button clicks)
bot.on('callback_query:data', handle_post_callback);

// Handle text/voice messages
bot.on('message', async (ctx) => {
  // First check if we're in a linking flow
  const handled_linking = await handle_linking_input(ctx);
  if (handled_linking) return;

  // Check if we're in a post conversation flow
  const session = await get_session(ctx.chat!.id);
  if (session) {
    await handle_post_message(ctx, session);
    return;
  }

  // No active session — random message
  await ctx.reply(
    "Hey! I'm Postly. I help you publish content.\n\n" +
    "Use /post to create a post, or /help to see all commands."
  );
});

// Error handler
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Export webhook handler for Express
export function get_webhook_handler() {
  return webhookCallback(bot, 'express', {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}
