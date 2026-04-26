import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import auth_routes from './routes/auth.routes';
import user_routes from './routes/user.routes';
import { error_handler } from './middleware/error.middleware';

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', auth_routes);
app.use('/api/user', user_routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(error_handler);

export default app;
