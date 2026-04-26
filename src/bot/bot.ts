import { Bot, webhookCallback } from 'grammy';
import { env } from '../config/env';
import { handle_start, handle_linking_input } from './commands/start';
import { handle_help } from './commands/help';
import { handle_accounts } from './commands/accounts';
import { handle_status } from './commands/status';
import { get_session } from './session';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.command('start', handle_start);
bot.command('help', handle_help);
bot.command('accounts', handle_accounts);
bot.command('status', handle_status);

bot.command('cancel', async (ctx) => {
  const { clear_session } = await import('./session');
  await clear_session(ctx.chat!.id);
  await ctx.reply('Cancelled. Use /post to start again.');
});

bot.on('message', async (ctx) => {
  const handled_linking = await handle_linking_input(ctx);
  if (handled_linking) return;

  const session = await get_session(ctx.chat!.id);
  if (session) {
    return;
  }

  await ctx.reply(
    "Hey! I'm Postly. I help you publish content.\n\n" +
    "Use /post to create a post, or /help to see all commands."
  );
});

bot.catch((err) => {
  console.error('Bot error:', err);
});

// Export webhook handler for Express
export function get_webhook_handler() {
  return webhookCallback(bot, 'express', {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}
