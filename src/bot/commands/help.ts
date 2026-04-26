import { Context } from 'grammy';

export async function handle_help(ctx: Context) {
  await ctx.reply(
    `Available Commands:\n\n` +
    `/post — Create and publish a new post\n` +
    `/status — View your last 5 posts\n` +
    `/accounts — View connected social accounts\n` +
    `/help — Show this message\n` +
    `/cancel — Cancel current operation`
  );
}
