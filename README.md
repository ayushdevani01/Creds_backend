# Postly — Multi-Platform AI Content Publishing Engine

**Live API URL:** TODO

Postly is a backend engine designed to help users generate and publish social media content across platforms like Twitter, LinkedIn, Instagram, and Threads. It primarily uses a Telegram bot as the user interface and relies on AI models like OpenAI and Claude for content generation.

## Features

- **Conversational UI:** A stateful, step-by-step Telegram bot flow that guides the user through post creation.
- **AI Content Engine:** Integrated with both OpenAI GPT-4o and Anthropic Claude 3.5 Sonnet to format posts according to platform constraints.
- **Multi-Platform Publishing:** Full integration with Twitter/X, along with scaffolded handlers ready for LinkedIn, Instagram, and Threads.
- **Reliable Pipeline:** Uses BullMQ and Redis for queuing jobs, handling partial failures, and applying exponential backoff for retries.
- **Secure Auth:** Implements short-lived JWT access tokens and long-lived, rotated refresh tokens. Social tokens are encrypted using AES-256-GCM before being stored in the database.
- **Dashboard API:** Provides endpoints for managing posts, soft-deletion, and retrieving real-time statistics for a frontend application.

## Local Setup

### Prerequisites
- Docker and Docker Compose
- Node.js v18+ (if you want to run it outside of Docker)

### One-Command Setup
```bash
docker-compose up --build
```
This command starts up the following services:
1. **API Server:** The Express.js application running on port 3000.
2. **Worker:** The BullMQ consumer that handles background publishing jobs.
3. **PostgreSQL:** The primary database for user and post data.
4. **Redis:** Used for session storage, maintaining the bot's state, and the job queue.

### Database Migration
If you are running the project locally for the first time, you'll need to set up the database schema:
```bash
npx prisma migrate dev
```

## Telegram Bot Configuration

1. Create a new bot and get a token from [@BotFather](https://t.me/botfather) on Telegram.
2. Expose your local server to the internet using a tool like ngrok: `ngrok http 3000` (or use your deployed live URL).
3. Register your webhook url with Telegram:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>/bot/webhook&secret_token=<SECRET>"
   ```
4. Start chatting with your bot using the available commands: `/start`, `/post`, `/status`, `/accounts`, and `/help`.

## API Documentation

You can find the full API documentation in the Postman collection included in this repository: `postly.postman_collection.json`.

### Key Endpoints
- `POST /api/auth/register` - Create a new user account
- `POST /api/posts/publish` - Direct publishing endpoint
- `GET /api/dashboard/stats` - Get a performance overview and post statistics
- `POST /api/content/generate` - Generate and preview AI content

## Architecture overview

```ascii
User → Telegram Bot → API Server (Express) → AI Engine (OpenAI/Claude)
                           ↓
                    BullMQ (Redis) → Worker → Platform APIs (Twitter/X, etc.)
                           ↓
                    PostgreSQL (Prisma)
```

## Design Decisions & Trade-offs

- **Snake Case:** All database fields and API responses use `snake_case` to maintain consistency across different platforms and tools.
- **Soft Delete:** Posts use a `deleted_at` timestamp instead of being hard-deleted. This allows users to potentially restore posts and keeps an audit trail of data.
- **Two-Process Architecture:** The API server and the background worker run as separate processes. This ensures the API and bot remain responsive even when the system is processing heavy publishing loads.
- **Manual State Machine:** Instead of relying on a library like `grammy-conversations`, the bot's state machine is managed manually using Redis. This approach provides maximum control over session persistence and TTL (time-to-live) expiry.

## Testing

```bash
npm test
```
The test suite includes at least 5 tests covering the authentication flow, content validation, job queueing, status retrieval, and database integration.

---