import { redis } from '../config/redis';
import { BotSession } from '../types';

const SESSION_TTL = 1800; // 30 minutes
const KEY_PREFIX = 'bot:session:';

export async function get_session(chat_id: number): Promise<BotSession | null> {
  const data = await redis.get(`${KEY_PREFIX}${chat_id}`);
  // Redis TTL handles "30 min of inactivity" — save_session() resets TTL on every interaction.
  return data ? JSON.parse(data) as BotSession : null;
}

export async function save_session(chat_id: number, session: BotSession): Promise<void> {
  await redis.set(
    `${KEY_PREFIX}${chat_id}`,
    JSON.stringify(session),
    'EX', SESSION_TTL
  );
}

export async function clear_session(chat_id: number): Promise<void> {
  await redis.del(`${KEY_PREFIX}${chat_id}`);
}
