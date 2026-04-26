import { Context } from 'grammy';
import * as auth_service from '../../services/auth.service';
import { prisma } from '../../config/database';

export async function handle_status(ctx: Context) {
  const chat_id = ctx.chat!.id;
  const user = await auth_service.find_by_telegram(chat_id.toString());

  if (!user) {
    await ctx.reply('You need to link your account first. Use /start');
    return;
  }

  const recent_posts = await prisma.posts.findMany({
    where: { user_id: user.id, deleted_at: null },
    include: { platform_posts: true },
    orderBy: { created_at: 'desc' },
    take: 5,
  });

  if (recent_posts.length === 0) {
    await ctx.reply('No posts yet. Use /post to create your first one!');
    return;
  }

  const lines = recent_posts.map((post, i) => {
    const statuses = post.platform_posts.map(pp => {
      const icon = pp.status === 'published' ? '[OK]' :
                   pp.status === 'failed' ? '[FAIL]' :
                   pp.status === 'processing' ? '[WAIT]' : '[PAUSE]';
      return `  ${icon} ${pp.platform}: ${pp.status}`;
    }).join('\n');

    const time_ago = get_time_ago(post.created_at);
    return `${i + 1}. "${post.idea.slice(0, 50)}..."\n${statuses}\n   Time: ${time_ago}`;
  });

  await ctx.reply(`Recent Posts:\n\n${lines.join('\n\n')}`);
}

function get_time_ago(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
