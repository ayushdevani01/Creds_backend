import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');

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
