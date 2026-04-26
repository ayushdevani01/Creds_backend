import { env } from './config/env';
import { prisma } from './config/database';
import './workers/index';

async function start_worker() {
  try {
    await prisma.$connect();
    console.log('Worker: Database connected');
    console.log(`Worker: Running in ${env.NODE_ENV} mode`);
  } catch (err) {
    console.error('Worker failed to start:', err);
    process.exit(1);
  }
}

start_worker();
