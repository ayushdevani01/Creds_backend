import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as social_service from './social.service';
import { env } from '../config/env';

export interface AIResponse {
  text: string;
  model_used: string;
  tokens_used: number;
}

// Get OpenAI client with user's key or fallback
async function get_openai_client(user_id: string): Promise<OpenAI> {
  const keys = await social_service.get_ai_keys(user_id);
  return new OpenAI({
    apiKey: keys.openai_key || env.OPENAI_API_KEY,
  });
}

// Get Anthropic client with user's key or fallback
async function get_anthropic_client(user_id: string): Promise<Anthropic> {
  const keys = await social_service.get_ai_keys(user_id);
  return new Anthropic({
    apiKey: keys.anthropic_key || env.ANTHROPIC_API_KEY,
  });
}

// Generate content using OpenAI GPT-4o
export async function generate_openai(
  user_id: string,
  system_prompt: string,
  user_prompt: string
): Promise<AIResponse> {
  const client = await get_openai_client(user_id);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system_prompt },
      { role: 'user', content: user_prompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0]?.message?.content || '';
  const tokens_used = response.usage?.total_tokens || 0;

  return { text, model_used: 'gpt-4o', tokens_used };
}

// Generate content using Anthropic Claude
export async function generate_anthropic(
  user_id: string,
  system_prompt: string,
  user_prompt: string
): Promise<AIResponse> {
  const client = await get_anthropic_client(user_id);

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: system_prompt,
    messages: [
      { role: 'user', content: user_prompt },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const tokens_used = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { text, model_used: 'claude-3-5-sonnet-20241022', tokens_used };
}
