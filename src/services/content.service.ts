import * as ai_service from './ai.service';
import { GenerateContentRequest } from '../types';

// Platform rules — enforced via system prompt
const PLATFORM_RULES: Record<string, string> = {
  twitter: `Twitter/X rules:
- Maximum 280 characters total (including hashtags)
- Include 2-3 relevant hashtags
- Start with a punchy, attention-grabbing opener
- No line breaks (single paragraph)`,

  linkedin: `LinkedIn rules:
- 800-1300 characters
- ALWAYS use professional tone (regardless of requested tone)
- Include 3-5 relevant hashtags at the end
- Use line breaks for readability
- Structure: hook → insight → call to action`,

  instagram: `Instagram rules:
- Write a compelling caption (any length)
- Include 10-15 relevant hashtags at the very end, separated from caption
- Use emojis naturally throughout
- Conversational and engaging`,

  threads: `Threads rules:
- Maximum 500 characters
- Conversational, casual tone
- No hashtags needed
- Direct and punchy`,
};

function build_system_prompt(platforms: string[], tone: string, language: string): string {
  const platform_sections = platforms.map(p => PLATFORM_RULES[p] || '').filter(Boolean).join('\n\n');

  return `You are a professional social media content creator.

Generate content for the following platforms simultaneously. Each platform has specific rules you MUST follow.

${platform_sections}

Global settings:
- Tone: ${tone} (except LinkedIn which is ALWAYS professional)
- Language: ${language}

CRITICAL: Respond in valid JSON format ONLY. No markdown, no code blocks, just raw JSON.
The JSON structure must be:
{
  "generated": {
    "<platform>": {
      "content": "the post content",
      "char_count": <number>,
      "hashtags": ["#tag1", "#tag2"]
    }
  }
}

Include entries ONLY for the requested platforms. char_count must accurately reflect the content length.
Hashtags array can be empty for platforms that don't need them.`;
}

function build_user_prompt(idea: string, post_type: string): string {
  return `Create a ${post_type} post based on this idea:\n\n"${idea}"`;
}

// Detect language using franc
async function detect_language(text: string): Promise<string> {
  try {
    // franc is ESM-only, use dynamic import
    const { franc } = await import('franc');
    const detected = franc(text);
    // franc returns ISO 639-3 codes, map common ones
    const lang_map: Record<string, string> = {
      eng: 'en', hin: 'hi', ara: 'ar', spa: 'es', fra: 'fr',
      deu: 'de', por: 'pt', jpn: 'ja', zho: 'zh', kor: 'ko',
    };
    return lang_map[detected] || 'en';
  } catch {
    return 'en';
  }
}

// MAIN FUNCTION — called by bot and API
export async function generate(user_id: string, request: GenerateContentRequest) {
  const { idea, post_type, platforms, tone, language, model } = request;

  // Auto-detect language if not explicitly set
  const resolved_language = language || await detect_language(idea);

  // Build prompts
  const system_prompt = build_system_prompt(platforms, tone, resolved_language);
  const user_prompt = build_user_prompt(idea, post_type);

  // Call AI
  let ai_response;
  if (model === 'openai') {
    ai_response = await ai_service.generate_openai(user_id, system_prompt, user_prompt);
  } else {
    ai_response = await ai_service.generate_anthropic(user_id, system_prompt, user_prompt);
  }

  // Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(ai_response.text);
  } catch {
    // Try to extract JSON from response if wrapped in markdown
    const json_match = ai_response.text.match(/\{[\s\S]*\}/);
    if (json_match) {
      try {
        parsed = JSON.parse(json_match[0]);
      } catch {
        throw new Error('AI returned invalid JSON. Try again.');
      }
    } else {
      throw new Error('AI returned invalid JSON. Try again.');
    }
  }

  return {
    generated: parsed.generated,
    model_used: ai_response.model_used,
    tokens_used: ai_response.tokens_used,
    language: resolved_language,
  };
}
