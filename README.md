# conversation-relay-typescript

A minimal Twilio ConversationRelay voice agent in TypeScript. Twilio handles ASR/TTS; this app runs the LLM loop over a WebSocket and exposes three tools:

- `switch_language` — changes TTS + ASR language mid-call
- `send_sms` — texts the caller (or any number)
- `handover_to_human` — ends the AI session and transfers the call

Reference: [ConversationRelay WebSocket messages](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages)

## Layout

```
src/
  index.ts            Fastify server: /voice, /handoff, /ws, /health
  config.ts           env loading
  systemPrompt.ts     agent behavior — edit here
  relay/
    types.ts          typed WebSocket messages (both directions)
    session.ts        per-call session, event dispatch
  llm/
    openai.ts         streaming + tool-call loop
  tools/
    index.ts          registry + ToolContext
    switchLanguage.ts
    sendSms.ts
    handoverToHuman.ts
```

## Setup

1. Copy env and fill in values:
   ```
   cp .env.example .env
   ```
2. Install:
   ```
   npm install
   ```
3. Expose the server publicly (Twilio needs `wss://`):
   ```
   ngrok http 8080
   ```
   Put the ngrok hostname (no scheme) in `.env` as `DOMAIN`. Both `https://` and `wss://` URLs are derived from it.
4. Run:
   ```
   npm run dev
   ```
5. Point your Twilio voice number's webhook at `POST https://<your-tunnel>/voice`.

## Endpoints

| Method | Path       | Purpose |
|-------:|------------|---------|
| POST   | `/voice`   | Returns TwiML that connects the call to `<ConversationRelay>` |
| POST   | `/handoff` | Called by Twilio after the AI session ends; dials the human agent |
| GET    | `/ws`      | WebSocket for ConversationRelay |
| GET    | `/health`  | Liveness |

## Adding a tool

1. Create `src/tools/myTool.ts` with a `ChatCompletionTool` schema and a handler.
2. Register it in `src/tools/index.ts`.
3. Restart. The system prompt already tells the model to use tools — nudge it there if the tool needs specific triggers.

## Prerequisites

Your Twilio account must be onboarded to ConversationRelay (Console → Voice → ConversationRelay). It is not enabled by default.
