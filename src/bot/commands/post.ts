import { Context, InlineKeyboard } from 'grammy';
import * as auth_service from '../../services/auth.service';
import * as user_service from '../../services/user.service';
import { get_session, save_session, clear_session } from '../session';
import { BotSession } from '../../types';
// post COMMAND 
export async function handle_post(ctx: Context) {
  const chat_id = ctx.chat!.id;
  const user = await auth_service.find_by_telegram(chat_id.toString());

  if (!user) {
    await ctx.reply('You need to link your account first. Use /start');
    return;
  }

  // Fetch user's language preference
  const profile = await user_service.get_profile(user.id);

  // Create new session
  const session: BotSession = {
    step: 'select_type',
    user_id: user.id,
    language: profile.default_language || 'en',
    created_at: Date.now(),
  };
  await save_session(chat_id, session);

  const keyboard = new InlineKeyboard()
    .text('Announcement', 'type:announcement').text('Thread', 'type:thread').row()
    .text('Story', 'type:story').text('Promotional', 'type:promotional').row()
    .text('Educational', 'type:educational').text('Opinion', 'type:opinion');

  await ctx.reply(`Hey ${user.name}! What type of post is this?`, {
    reply_markup: keyboard,
  });
}

//CALLBACK QUERY HANDLER (button clicks) 
export async function handle_post_callback(ctx: Context) {
  const chat_id = ctx.chat!.id;
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  await ctx.answerCallbackQuery(); // acknowledge the button click

  const session = await get_session(chat_id);
  if (!session) {
    await ctx.answerCallbackQuery({ text: 'Session expired. Use /post to start over.' });
    return;
  }

  // Step 1: Post type selected
  if (data.startsWith('type:') && session.step === 'select_type') {
    session.post_type = data.split(':')[1];
    session.step = 'select_platforms';
    session.platforms = [];
    await save_session(chat_id, session);

    await ctx.editMessageText('Which platforms should I post to?', {
      reply_markup: get_platform_keyboard([]),
    });
    return;
  }

  // Step 2: Platform selection (multi-select)
  if (data.startsWith('platform:') && session.step === 'select_platforms') {
    const platform = data.split(':')[1];

    if (platform === 'all') {
      session.platforms = ['twitter', 'linkedin', 'instagram', 'threads'];
    } else {
      // Toggle platform
      const idx = session.platforms!.indexOf(platform);
      if (idx > -1) {
        session.platforms!.splice(idx, 1);
      } else {
        session.platforms!.push(platform);
      }
    }
    await save_session(chat_id, session);

    await ctx.editMessageText(
      `Selected: ${session.platforms!.length > 0 ? session.platforms!.join(', ') : 'none'}\n\nPick platforms:`,
      { reply_markup: get_platform_keyboard(session.platforms!) }
    );
    return;
  }

  // Step 2 → 3: Done selecting platforms
  if (data === 'platforms_done' && session.step === 'select_platforms') {
    if (!session.platforms || session.platforms.length === 0) {
      await ctx.answerCallbackQuery({ text: 'Select at least one platform!' });
      return;
    }

    session.step = 'select_tone';
    await save_session(chat_id, session);

    const keyboard = new InlineKeyboard()
      .text('Professional', 'tone:professional').text('Casual', 'tone:casual').row()
      .text('Witty', 'tone:witty').text('Authoritative', 'tone:authoritative').row()
      .text('Friendly', 'tone:friendly');

    await ctx.editMessageText('What tone should the content have?', {
      reply_markup: keyboard,
    });
    return;
  }

  // Step 3: Tone selected → Step 4: AI model
  if (data.startsWith('tone:') && session.step === 'select_tone') {
    session.tone = data.split(':')[1];
    session.step = 'select_model';
    await save_session(chat_id, session);

    const keyboard = new InlineKeyboard()
      .text('GPT (OpenAI)', 'model:openai').row()
      .text('Claude (Anthropic)', 'model:anthropic');

    await ctx.editMessageText('Which AI model do you want to use?', {
      reply_markup: keyboard,
    });
    return;
  }

  // Step 4: Model selected → Step 5: Ask for idea
  if (data.startsWith('model:') && session.step === 'select_model') {
    session.model = data.split(':')[1];
    session.step = 'awaiting_idea';
    await save_session(chat_id, session);

    await ctx.editMessageText(
      'Tell me the idea or core message — keep it brief (max 500 chars).\n\n' +
      'You can also send a voice message!'
    );
    return;
  }

  // Step 7: Confirm/Edit/Cancel
  if (data === 'confirm_post' && session.step === 'preview') {
    session.step = 'publishing';
    await save_session(chat_id, session);

    await ctx.editMessageText(
      'Post queued! Publishing happens in the background.\n\n' +
      'Use /status in a few moments to check the final result of each platform.'
    );

    await clear_session(chat_id);
    return;
  }

  if (data === 'edit_idea' && session.step === 'preview') {
    session.step = 'awaiting_idea';
    session.idea = undefined;
    session.generated_content = undefined;
    await save_session(chat_id, session);

    await ctx.editMessageText(
      'Tell me the idea or core message — keep it brief (max 500 chars).\n\n' +
      'You can also send a voice message!'
    );
    return;
  }

  if (data === 'cancel_post') {
    await clear_session(chat_id);
    await ctx.editMessageText('Post cancelled.');
    return;
  }
}

// TEXT/VOICE MESSAGE HANDLER (Step 5: idea input)
export async function handle_post_message(ctx: Context, session: BotSession) {
  const chat_id = ctx.chat!.id;

  if (session.step !== 'awaiting_idea') {
    await ctx.reply('Please tap one of the buttons above to continue.\nOr type /cancel to start over.');
    return;
  }

  let idea: string;

  if (ctx.message?.voice) {
    await ctx.reply('Transcribing your voice message...');
    await ctx.reply('Voice input will be available soon. Please type your idea instead.');
    return;
  } else if (ctx.message?.text) {
    idea = ctx.message.text;
  } else {
    await ctx.reply('Please send a text message or voice message.');
    return;
  }

  if (idea.length > 500) {
    await ctx.reply(`Too long (${idea.length} chars). Keep it under 500.`);
    return;
  }

  if (idea.length < 5) {
    await ctx.reply('Too short. Give me a bit more to work with.');
    return;
  }

  session.idea = idea;
  session.step = 'generating';
  await save_session(chat_id, session);

  await ctx.reply(`Idea: "${idea}"\n\nGenerating your content...`);

  try {
    // Placeholder content until AI engine is wired up
    const generated: Record<string, { content: string; char_count: number; hashtags?: string[] }> = {};

    for (const platform of session.platforms!) {
      if (platform === 'twitter') {
        generated.twitter = {
          content: `[Generated Twitter content for: ${idea.slice(0, 60)}]`,
          char_count: 200,
          hashtags: ['#placeholder'],
        };
      } else if (platform === 'linkedin') {
        generated.linkedin = {
          content: `[Generated LinkedIn content for: ${idea.slice(0, 60)}]`,
          char_count: 800,
          hashtags: ['#placeholder'],
        };
      } else if (platform === 'instagram') {
        generated.instagram = {
          content: `[Generated Instagram content for: ${idea.slice(0, 60)}]`,
          char_count: 300,
          hashtags: ['#placeholder', '#instagram'],
        };
      } else if (platform === 'threads') {
        generated.threads = {
          content: `[Generated Threads content for: ${idea.slice(0, 60)}]`,
          char_count: 250,
        };
      }
    }

    session.generated_content = generated;
    session.step = 'preview';
    await save_session(chat_id, session);

    // Build preview message
    let preview = '';
    for (const platform of session.platforms!) {
      const content = generated[platform];
      if (content) {
        const tags = content.hashtags ? `\n${content.hashtags.join(' ')}` : '';
        preview += `- ${platform} (${content.char_count} chars):\n"${content.content}"${tags}\n\n`;
      }
    }

    const keyboard = new InlineKeyboard()
      .text('Yes, Post Now', 'confirm_post').row()
      .text('Edit Idea', 'edit_idea')
      .text('Cancel', 'cancel_post');

    await ctx.reply(preview + 'Confirm and post?', { reply_markup: keyboard });
  } catch (err: any) {
    session.step = 'awaiting_idea';
    await save_session(chat_id, session);
    await ctx.reply(`Error generating content: ${err.message}\n\nTry again or type /cancel.`);
  }
}

// HELPER: Platform selection keyboard
function get_platform_keyboard(selected: string[]): InlineKeyboard {
  const check = (p: string) => selected.includes(p) ? '[x] ' : '[ ] ';
  return new InlineKeyboard()
    .text(`${check('twitter')}Twitter/X`, 'platform:twitter')
    .text(`${check('linkedin')}LinkedIn`, 'platform:linkedin').row()
    .text(`${check('instagram')}Instagram`, 'platform:instagram')
    .text(`${check('threads')}Threads`, 'platform:threads').row()
    .text('All', 'platform:all').row()
    .text('Done', 'platforms_done');
}
