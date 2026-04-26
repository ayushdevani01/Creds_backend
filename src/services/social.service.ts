import { prisma } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { not_found } from '../utils/errors';

export async function add_account(user_id: string, data: {
  platform: string; access_token: string; refresh_token?: string; handle?: string;
}) {
  const encrypted = {
    user_id,
    platform: data.platform,
    access_token_enc: encrypt(data.access_token),
    refresh_token_enc: data.refresh_token ? encrypt(data.refresh_token) : null,
    handle: data.handle || null,
  };

  return prisma.social_accounts.upsert({
    where: { user_id_platform: { user_id, platform: data.platform } },
    create: encrypted,
    update: {
      access_token_enc: encrypted.access_token_enc,
      ...(encrypted.refresh_token_enc !== null && { refresh_token_enc: encrypted.refresh_token_enc }),
      ...(encrypted.handle !== null && { handle: encrypted.handle }),
    },
    select: { id: true, platform: true, handle: true, connected_at: true },
  });
}

export async function list_accounts(user_id: string) {
  return prisma.social_accounts.findMany({
    where: { user_id },
    select: { id: true, platform: true, handle: true, connected_at: true },
  });
}

export async function delete_account(user_id: string, account_id: string) {
  const account = await prisma.social_accounts.findFirst({
    where: { id: account_id, user_id },
  });
  if (!account) throw not_found('Social account not found');

  await prisma.social_accounts.delete({ where: { id: account_id } });
  return { message: 'Account disconnected' };
}

export async function get_decrypted_tokens(user_id: string, platform: string) {
  const account = await prisma.social_accounts.findUnique({
    where: { user_id_platform: { user_id, platform } },
  });
  if (!account) throw not_found(`No ${platform} account connected`);

  return {
    access_token: decrypt(account.access_token_enc),
    refresh_token: account.refresh_token_enc ? decrypt(account.refresh_token_enc) : null,
    handle: account.handle,
  };
}

export async function upsert_ai_keys(user_id: string, data: {
  openai_key?: string; anthropic_key?: string;
}) {
  const result = await prisma.ai_keys.upsert({
    where: { user_id },
    create: {
      user_id,
      ...(data.openai_key && { openai_key_enc: encrypt(data.openai_key) }),
      ...(data.anthropic_key && { anthropic_key_enc: encrypt(data.anthropic_key) }),
    },
    update: {
      ...(data.openai_key && { openai_key_enc: encrypt(data.openai_key) }),
      ...(data.anthropic_key && { anthropic_key_enc: encrypt(data.anthropic_key) }),
    },
  });

  return {
    id: result.id,
    user_id: result.user_id,
    updated_at: result.updated_at,
    has_openai_key: !!result.openai_key_enc,
    has_anthropic_key: !!result.anthropic_key_enc,
  };
}

export async function get_ai_keys(user_id: string) {
  const keys = await prisma.ai_keys.findUnique({ where: { user_id } });
  if (!keys) return { openai_key: null, anthropic_key: null };

  return {
    openai_key: keys.openai_key_enc ? decrypt(keys.openai_key_enc) : null,
    anthropic_key: keys.anthropic_key_enc ? decrypt(keys.anthropic_key_enc) : null,
  };
}
