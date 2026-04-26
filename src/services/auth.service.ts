import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { bad_request, unauthorized, conflict, not_found } from '../utils/errors';

const BCRYPT_COST = 12;

// Generate JWT access token (15 min)
function generate_access_token(user_id: string, email: string): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] };
  return jwt.sign({ user_id, email }, env.JWT_SECRET, options);
}

// Generate refresh token (random UUID, stored in DB, 7 days)
async function generate_refresh_token(user_id: string): Promise<string> {
  const token = uuid();
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + env.JWT_REFRESH_EXPIRY_DAYS);

  await prisma.refresh_tokens.create({
    data: { token, user_id, expires_at },
  });

  return token;
}

// REGISTER
export async function register(email: string, password: string, name: string) {
  email = email.toLowerCase();

  // Check if email exists
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) throw conflict('Email already registered');

  // Validate password
  if (password.length < 8) throw bad_request('Password must be at least 8 characters');

  // Hash password with bcrypt cost 12
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);

  // Create user
  const user = await prisma.users.create({
    data: { email, password_hash, name },
  });

  // Generate tokens
  const access_token = generate_access_token(user.id, user.email);
  const refresh_token = await generate_refresh_token(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    access_token,
    refresh_token,
  };
}

// LOGIN
export async function login(email: string, password: string) {
  email = email.toLowerCase();

  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) throw unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw unauthorized('Invalid email or password');

  const access_token = generate_access_token(user.id, user.email);
  const refresh_token = await generate_refresh_token(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    access_token,
    refresh_token,
  };
}

// REFRESH — rotate refresh token on use
export async function refresh(old_token: string) {
  // Find the token
  const stored = await prisma.refresh_tokens.findUnique({
    where: { token: old_token },
    include: { user: true },
  });

  if (!stored) throw unauthorized('Invalid refresh token');
  if (stored.expires_at < new Date()) {
    // Delete expired token
    await prisma.refresh_tokens.delete({ where: { id: stored.id } });
    throw unauthorized('Refresh token expired');
  }

  // ROTATE: delete old token, create new one
  await prisma.refresh_tokens.delete({ where: { id: stored.id } });

  const access_token = generate_access_token(stored.user.id, stored.user.email);
  const refresh_token = await generate_refresh_token(stored.user.id);

  return {
    user: { id: stored.user.id, email: stored.user.email, name: stored.user.name },
    access_token,
    refresh_token,
  };
}

// LOGOUT — invalidate refresh token
export async function logout(refresh_token: string) {
  const stored = await prisma.refresh_tokens.findUnique({
    where: { token: refresh_token },
  });

  if (stored) {
    await prisma.refresh_tokens.delete({ where: { id: stored.id } });
  }
  // Always return success even if token not found (idempotent)
}

// ME — get current user profile
export async function get_me(user_id: string) {
  const user = await prisma.users.findUnique({
    where: { id: user_id },
    select: {
      id: true, email: true, name: true, bio: true,
      default_tone: true, default_language: true,
      telegram_chat_id: true, created_at: true,
    },
  });

  if (!user) throw not_found('User not found');
  return user;
}

// LINK TELEGRAM — used by bot /start command
export async function link_telegram(user_id: string, telegram_chat_id: string) {
  await prisma.users.update({
    where: { id: user_id },
    data: { telegram_chat_id },
  });
}

// FIND BY TELEGRAM — used by bot to check if user is linked
export async function find_by_telegram(telegram_chat_id: string) {
  return prisma.users.findUnique({
    where: { telegram_chat_id },
    select: { id: true, email: true, name: true },
  });
}
