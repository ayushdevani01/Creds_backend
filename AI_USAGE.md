# AI Usage Documentation

In accordance with the Credes AI Policy, this document provides a comprehensive, transparent, and highly detailed log of how AI tools (specifically Google Gemini 2.0 and Anthropic Claude 3) were used to accelerate the development of Postly. 

Rather than just generating code, AI was used as a sounding board, a pair programmer, and a senior reviewer. Below are the exact conversations, prompts, tasks, and the subsequent human validation steps taken for every significant architectural component of the system.

---

## 1. Project Scaffolding & Infrastructure

**Tool Used:** Gemini CLI (Gemini 3.1 Pro)

**Task:** Initializing the Express server with TypeScript, Prisma, and BullMQ, ensuring a clean layered architecture.

**The Conversation:**
> **Human:** I need to set up a new Node.js v18 project using Express, TypeScript, and Prisma. The app will be a multi-platform social media publisher. It also needs BullMQ backed by Redis for background jobs. Give me the terminal commands to initialize the project, install the correct dependencies, and the initial `tsconfig.json`. Also, ensure we use `snake_case` for all database fields.
> 
> **AI:** Here are the commands to initialize your project and install the necessary dependencies... [AI provided `npm init`, `npm install express typescript prisma @prisma/client bullmq ioredis...` commands].
> Here is a recommended `tsconfig.json` with strict type checking enabled:
> ```json
> {
>   "compilerOptions": {
>     "target": "es2022",
>     "module": "commonjs",
>     "outDir": "./dist",
>     "rootDir": "./src",
>     "strict": true,
>     "esModuleInterop": true,
>     "skipLibCheck": true,
>     "forceConsistentCasingInFileNames": true
>   }
> }
> ```
> For Prisma, remember to add `@map` to map your camelCase TypeScript properties to snake_case database columns, or just use snake_case directly in the schema if you prefer consistency across the stack.

**What I Changed/Validated:**
- **Validation:** I ran the provided terminal commands to scaffold the project. I reviewed the `tsconfig.json` to ensure `strict: true` was enabled, which is critical for catching edge cases in TypeScript.
- **Change:** The AI suggested mapping camelCase properties to snake_case columns. I decided against this. To maintain absolute consistency between the Postgres DB, the TypeScript backend, and the JSON payloads sent to the frontend/bot, I enforced `snake_case` globally across the entire codebase.

---

## 2. Database Schema Design

**Tool Used:** Gemini CLI (Gemini 3.1 pro)

**Task:** Designing the relational structure for users, posts, platform-specific jobs, and encrypted social accounts.

**The Conversation:**
> **Human:** Help me design a Prisma schema for this application. We need:
> 1. `users` (email, password, settings)
> 2. `social_accounts` (encrypted OAuth tokens per platform)
> 3. `posts` (the parent post, holds the idea and global status)
> 4. `platform_posts` (child posts, one per platform like Twitter, LinkedIn. Holds specific status and retry counts).
> 5. Make sure to include soft deletes for posts and proper indexing for a dashboard that will filter by user_id and status.
> 
> **AI:** [AI generated the Prisma schema with the requested models, including `@default(uuid())` for IDs and relations between `users`, `posts`, and `platform_posts`].
> I've added `@@index([user_id])` and `@@index([status])` on the `posts` table as requested. For the encrypted tokens, I used `String` types. You'll need to handle the encryption/decryption at the application level before saving.

**What I Changed/Validated:**
- **Validation:** I reviewed the relationships (one-to-many from users to posts, and posts to platform_posts). The indexing strategy was correct for the required dashboard filtering.
- **Change:** The AI missed adding a unique constraint to ensure a user couldn't link the same social platform twice. I manually added `@@unique([user_id, platform])` to the `social_accounts` model. I also added `onDelete: Cascade` to the relations to prevent orphaned records if a user deletes their account.

---

## 3. Telegram Bot State Machine

**Tool Used:** Gemini CLI (Gemini 3.1 pro)

**Task:** Implementing the 8-step conversational state machine for the Telegram bot using `grammY` and Redis.

**The Conversation:**
> **Human:** I'm building a Telegram bot using `grammY`. I need a stateful conversation flow. The steps are:
> 1. Select post type (Inline buttons)
> 2. Select platforms (Multi-select inline buttons)
> 3. Select tone
> 4. Select AI model (OpenAI or Claude)
> 5. Wait for text or voice input (the idea)
> 6. Show preview
> 7. Confirm and Post.
> Do NOT use grammy-conversations. I want to manually store the state in Redis so I have full control over the 30-minute expiration TTL.
> 
> **AI:** To implement this manually with Redis, you'll need a session manager. First, define the state interface... [AI provided a `BotSession` interface and a basic switch-case structure for handling `callback_query` events based on the current step].
> When the user clicks an inline button, update the state in Redis and edit the message to show the next step's keyboard. For multi-select, you'll need to toggle the selection in the state array and re-render the keyboard.

**What I Changed/Validated:**
- **Validation:** The fundamental approach of using `callback_query` data routing (e.g., `type:announcement`, `platform:twitter`) was solid. 
- **Change:** The AI's generated code placed all the Redis `get/set` logic directly inside the bot handlers. I refactored this into a dedicated `session.ts` service. I also implemented the exact multi-select toggle logic for platforms, ensuring the user could click "Done" only after selecting at least one platform. I added the logic to reset the 30-minute Redis TTL on *every* user interaction.

---

## 4. Auth & Security (Encryption)

**Tool Used:** Gemini CLI (Gemini 3.1 pro)

**Task:** Implementing JWT access/refresh token rotation and AES-256-GCM encryption for social API keys.

**The Conversation:**
> **Human:** Write an Express authentication service. I need a short-lived signed JWT access token (15 mins) and a long-lived refresh token (UUID, 7 days) stored in Postgres. Also, provide a utility function to encrypt and decrypt social media access tokens using AES-256-GCM before they go into the DB.
> 
> **AI:** [AI provided the login/register/refresh functions]. For the encryption:
> ```typescript
> import crypto from 'crypto';
> const ALGORITHM = 'aes-256-gcm';
> export function encrypt(text: string, key: string) {
>   const iv = crypto.randomBytes(16);
>   const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
>   // ... cipher.update and cipher.final
>   const authTag = cipher.getAuthTag();
>   return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
> }
> ```

**What I Changed/Validated:**
- **Validation:** I verified the `aes-256-gcm` implementation. The AI correctly included the Initialization Vector (IV) and the Authentication Tag, which are crucial for GCM mode to prevent tampering.
- **Change:** I modified the `auth.service.ts` to ensure the refresh token is strictly rotated on *every single use* (deleting the old one and issuing a new one) to prevent replay attacks, rather than just validating the expiry.

---

## 5. Queue & Publishing Architecture (BullMQ)

**Tool Used:** Gemini CLI (Gemini 3.1 pro)

**Task:** Setting up BullMQ workers with custom backoff strategies and partial failure handling.

**The Conversation:**
> **Human:** I need a BullMQ worker setup for publishing posts. The queue receives a job containing a `platform_post_id`. The worker should process it based on the platform. Crucially, the retry policy must be exactly: 3 attempts with exponential backoff of 1s -> 5s -> 25s. How do I configure that specific backoff in BullMQ?
> 
> **AI:** BullMQ allows custom backoff strategies. You can define a function when creating the Worker:
> ```typescript
> const worker = new Worker('publish', async (job) => {
>   // process job
> }, {
>   settings: {
>     backoffStrategy: (attemptsMade: number) => {
>       return Math.pow(5, attemptsMade - 1) * 1000;
>     }
>   }
> });
> ```
> And when you add the job to the queue, specify `backoff: { type: 'custom' }` and `attempts: 4` (initial attempt + 3 retries).

**What I Changed/Validated:**
- **Validation:** I tested the mathematical formula provided by the AI (`Math.pow(5, attemptsMade - 1) * 1000`).
  - attemptsMade = 1 -> 5^0 * 1000 = 1000ms (1s)
  - attemptsMade = 2 -> 5^1 * 1000 = 5000ms (5s)
  - attemptsMade = 3 -> 5^2 * 1000 = 25000ms (25s)
  The math was perfectly aligned with the assignment requirements.
- **Change:** I added a `failed` event listener to the worker. If a job fails its final attempt, it queries the database to update the `platform_posts` status to `failed` with the error message. Then, it calls `update_parent_post_status` to evaluate if the overall parent post should be marked as `failed` (if all children failed) or `partially_published`.

---

## 6. AI Content Engine

**Tool Used:** Gemini CLI (Gemini 3.1 pro)

**Task:** Structuring the system prompts to ensure OpenAI and Claude return strict, platform-specific JSON.

**The Conversation:**
> **Human:** I need a system prompt that forces an LLM to generate social media content for multiple platforms simultaneously (e.g., Twitter, LinkedIn). It MUST return ONLY valid JSON. Twitter must be under 280 chars with 2 hashtags. LinkedIn must be 800-1300 chars and ALWAYS use a professional tone, regardless of the user's global tone preference.
> 
> **AI:** [AI generated a complex system prompt detailing the rules for each platform and provided a strict JSON schema template to follow]. To enforce JSON only, tell the model "No markdown, no code blocks, just raw JSON" and use `response_format: { type: 'json_object' }` for the OpenAI API call.

**What I Changed/Validated:**
- **Validation:** The prompt structure was excellent. I implemented the OpenAI `json_object` flag as suggested.
- **Change:** Anthropic's Claude does not have a native `json_object` flag. I added a fallback regex parser `match(/\{[\s\S]*\}/)` in `content.service.ts` to manually extract the JSON block just in case Claude wrapped its response in markdown code blocks.

---

## 7. Final Verification & Quality Assurance

**Tool Used:** Anthropic Claude Opus 4.6

**Task:** Comprehensive final review of the entire codebase, architecture, and alignment with the initial pdf requirements before submission.

**The Conversation:**
> **Human:** [Attached the entire codebase, including `schema.prisma`, `worker.ts`, `auth.service.ts`, `bot.ts`, and the PDF requirements]. You are a Senior Staff Backend Engineer. I am submitting this for an internship assignment. Brute-force review my codebase against the PDF requirements. Do not be nice. Tell me exactly what I missed, what edge cases are open, and if my architecture holds up.
> 
> **AI (Opus):** I have reviewed the codebase. Structurally, it is extremely sound. The decoupling of the API and Worker is correct. The AES encryption is implemented safely. The custom BullMQ backoff matches the math required.
> However, I found a few edge cases:
> 1. In your `delete_post` function (soft delete), you are cancelling queued jobs, but what if a job is currently in the `processing` state? You shouldn't allow deleting a post that is actively being published right this second.
> 2. In your test setup, Prisma might leak connections if not disconnected explicitly in `afterAll`.
> 3. Your JWT `expiresIn` is coming from env, make sure it maps to a type accepted by `jsonwebtoken`.

**What I Changed/Validated:**
- **Validation:** Opus correctly identified a race condition in the soft-delete logic.
- **Change:** I immediately updated `post.controller.ts -> delete_post` to check if `platform_posts.some(pp => ['published', 'processing'].includes(pp.status))`. If true, the API rejects the deletion request with a 400 error, ensuring we don't orphan a job that's mid-flight. I also updated the Jest `setup.ts` to properly tear down Prisma connections. 

---

## Conclusion
The use of AI throughout this project was strictly as a collaborative force-multiplier. No code was copy-pasted blindly. Every snippet generated was mathematically verified, logically tested against edge cases (like race conditions in queues), and heavily refactored to fit the specific architectural vision of a robust, production-ready system.