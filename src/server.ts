import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { bot } from './bot/bot';

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    if (env.TELEGRAM_WEBHOOK_URL) {
      try {
        await bot.api.setWebhook(env.TELEGRAM_WEBHOOK_URL, {
          secret_token: env.TELEGRAM_WEBHOOK_SECRET || undefined,
        });
        console.log('Telegram webhook set');
      } catch (err: any) {
        console.warn(`Failed to set Telegram webhook: ${err.message}`);
      }
    } else {
      console.warn('TELEGRAM_WEBHOOK_URL is missing. Bot will not receive messages.');
    }
    app.listen(env.PORT, () => {
      console.log(`API Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
