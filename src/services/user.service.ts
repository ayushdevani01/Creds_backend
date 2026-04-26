import { prisma } from '../config/database';
import { not_found } from '../utils/errors';

export async function get_profile(user_id: string) {
  const user = await prisma.users.findUnique({
    where: { id: user_id },
    select: {
      id: true, email: true, name: true, bio: true,
      default_tone: true, default_language: true,
      telegram_chat_id: true, created_at: true, updated_at: true,
    },
  });
  if (!user) throw not_found('User not found');
  return user;
}

export async function update_profile(user_id: string, data: {
  name?: string; bio?: string; default_tone?: string; default_language?: string;
}) {
  return prisma.users.update({
    where: { id: user_id },
    data,
    select: {
      id: true, email: true, name: true, bio: true,
      default_tone: true, default_language: true,
      telegram_chat_id: true, created_at: true, updated_at: true,
    },
  });
}
