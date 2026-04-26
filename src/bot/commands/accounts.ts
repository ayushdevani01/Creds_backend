import { Context } from 'grammy';
import * as auth_service from '../../services/auth.service';
import * as social_service from '../../services/social.service';

export async function handle_accounts(ctx: Context) {
  const chat_id = ctx.chat!.id;
  const user = await auth_service.find_by_telegram(chat_id.toString());

  if (!user) {
    await ctx.reply('You need to link your account first. Use /start');
    return;
  }

  const accounts = await social_service.list_accounts(user.id);

  if (accounts.length === 0) {
    await ctx.reply('No social accounts connected yet.\nUse the API to connect: POST /api/user/social-accounts');
    return;
  }

  const list = accounts.map(a =>
    `- ${a.platform}: @${a.handle || 'connected'}`
  ).join('\n');

  await ctx.reply(`Connected Accounts:\n\n${list}`);
}
