import { Request } from 'express';

// Extend Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Bot session stored in Redis
export interface BotSession {
  step: string;
  user_id: string;
  post_type?: string;
  platforms?: string[];
  tone?: string;
  model?: string;
  language?: string;   // user's default_language from DB
  idea?: string;
  generated_content?: Record<string, any>;
  model_used?: string;   // actual model name returned by AI
  tokens_used?: number;  // tokens consumed
  created_at: number;    // timestamp
}

// Job data for BullMQ
export interface PublishJobData {
  platform_post_id: string;
  user_id: string;
  platform: string;
  content: string;
  hashtags: string[];
}

// Content generation request
export interface GenerateContentRequest {
  idea: string;
  post_type: string;
  platforms: string[];
  tone: string;
  language: string;
  model: string;
}
