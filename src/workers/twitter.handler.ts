import { TwitterApi } from 'twitter-api-v2';
import { prisma } from '../config/database';
import * as social_service from '../services/social.service';
import { PublishJobData } from '../types';
import { update_parent_post_status } from './utils';

export async function publish_to_twitter(data: PublishJobData): Promise<void> {
  // 1. Idempotency check — already published?
  const existing = await prisma.platform_posts.findUnique({
    where: { id: data.platform_post_id },
    select: { external_id: true, status: true },
  });

  if (existing?.external_id) {
    console.log(`Skipping ${data.platform_post_id} — already published (${existing.external_id})`);
    return;
  }

  // 2. Get decrypted Twitter tokens for this user
  const tokens = await social_service.get_decrypted_tokens(data.user_id, 'twitter');

  // 3. Create Twitter client with user's tokens
  const client = new TwitterApi(tokens.access_token);

  // 4. Build tweet text (content + hashtags)
  let tweet_text = data.content;
  if (data.hashtags && data.hashtags.length > 0) {
    const hashtag_str = data.hashtags.join(' ');
    // Only append if it fits within 280 chars
    if ((tweet_text + '\n\n' + hashtag_str).length <= 280) {
      tweet_text = tweet_text + '\n\n' + hashtag_str;
    }
  }

  // Enforce 280 char limit
  if (tweet_text.length > 280) {
    tweet_text = tweet_text.slice(0, 277) + '...';
  }

  // 5. Post tweet
  const result = await client.v2.tweet(tweet_text);

  // 6. Update platform_post with success
  await prisma.platform_posts.update({
    where: { id: data.platform_post_id },
    data: {
      status: 'published',
      published_at: new Date(),
      external_id: result.data.id,
    },
  });

  // 7. Recompute parent post status
  await update_parent_post_status(data.platform_post_id);

  console.log(`Published to Twitter: ${result.data.id}`);
}
