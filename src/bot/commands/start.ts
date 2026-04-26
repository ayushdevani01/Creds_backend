import { Context } from 'grammy';
import * as auth_service from '../../services/auth.service';
import { redis } from '../../config/redis';

const LINK_PREFIX = 'bot:link:';

export async function handle_start(ctx: Context) {
  const chat_id = ctx.chat!.id;

  const user = await auth_service.find_by_telegram(chat_id.toString());

  if (user) {
    await ctx.reply(
      `Hey ${user.name}! Ready to post?\n\n` +
      `Use /post to create a new post, or /help to see all commands.`
    );
    return;
  }

  await redis.set(`${LINK_PREFIX}${chat_id}`, JSON.stringify({ step: 'awaiting_email' }), 'EX', 300);
  await ctx.reply(
    `Welcome to Postly!\n\n` +
    `I help you publish content to social platforms.\n\n` +
    `To get started, I need to link your account.\n` +
    `Please enter your email:`
  );
}

export async function handle_linking_input(ctx: Context): Promise<boolean> {
  const chat_id = ctx.chat!.id;
  const text = ctx.message?.text;
  if (!text) return false;

  const link_data = await redis.get(`${LINK_PREFIX}${chat_id}`);
  if (!link_data) return false;

  const state = JSON.parse(link_data);

  if (state.step === 'awaiting_email') {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(text)) {
      await ctx.reply('Invalid email format. Please try again:');
      return true;
    }

    state.step = 'awaiting_password';
    state.email = text;
    await redis.set(`${LINK_PREFIX}${chat_id}`, JSON.stringify(state), 'EX', 300);
    await ctx.reply('Now enter your password:');
    return true;
  }

  if (state.step === 'awaiting_password') {
    try {
      const result = await auth_service.login(state.email, text);

      await auth_service.link_telegram(result.user.id, chat_id.toString());

      await redis.del(`${LINK_PREFIX}${chat_id}`);

      await ctx.reply(
        `Account linked! Hey ${result.user.name}\n\n` +
        `You're all set. Use /post to create your first post, or /help to see all commands.`
      );
    } catch (err: any) {
      await ctx.reply(
        `Login failed: ${err.message}\n\n` +
        `Don't have an account? Register at your API URL first, then come back and type /start.`
      );
      await redis.del(`${LINK_PREFIX}${chat_id}`);
    }
    return true;
  }

  return false;
}
