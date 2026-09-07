import Fastify from "fastify";
import formbody from "@fastify/formbody";
import websocket from "@fastify/websocket";
import twilio from "twilio";
import { config } from "./config.js";
import { handleConnection } from "./relay/session.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname,reqId,req,res,responseTime",
        singleLine: true,
        colorize: true,
      },
    },
  },
});

await app.register(formbody);
await app.register(websocket);

// Health check
app.get("/health", async () => ({ ok: true }));

// Catch-all webhook logger — logs method, headers, query, and body for any
// request. Useful for inspecting Twilio status callbacks, event webhooks,
// or anything else pointed at this server.
app.route({
  method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  url: "/webhook",
  handler: async (req, reply) => {
    app.log.info(
      {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
      },
      "[webhook] incoming event",
    );
    reply.type("text/xml").send("<Response/>");
  },
});

// Inbound call webhook — returns TwiML that hands the call to ConversationRelay.
app.all("/incoming-call", async (_req, reply) => {
  const response = new twilio.twiml.VoiceResponse();
  const wsUrl = `${config.WS_BASE_URL}/ws`;
  const handoffUrl = `${config.HTTP_BASE_URL}/handoff`;

  const connect = response.connect({ action: handoffUrl });
  connect.conversationRelay({
    url: wsUrl,
    welcomeGreeting: config.CR_WELCOME_GREETING,
    voice: config.CR_VOICE,
    language: config.CR_LANGUAGE,
    ttsProvider: config.CR_TTS_PROVIDER,
  });

  reply.type("text/xml").send(response.toString());
});

// Called by Twilio when the <Connect> verb finishes (e.g. after our `end`
// message with handoffData). Return TwiML to dial the human agent.
app.post("/handoff", async (req, reply) => {
  const body = (req.body ?? {}) as Record<string, string>;
  let handoff: { reason?: string; summary?: string } = {};
  try {
    handoff = JSON.parse(body.HandoffData ?? "{}");
  } catch {
    // ignore, leave empty
  }
  app.log.info({ handoff }, "handoff received");

  const response = new twilio.twiml.VoiceResponse();
  response.say(
    handoff.summary
      ? `Transferring you now. Context: ${handoff.summary}`
      : "Transferring you to an agent now.",
  );
  response.dial(config.HUMAN_AGENT_NUMBER);
  reply.type("text/xml").send(response.toString());
});

// ConversationRelay WebSocket endpoint.
await app.register(async (fastify) => {
  fastify.get("/ws", { websocket: true }, (socket) => {
    handleConnection(socket);
  });
});

app.listen({ port: config.PORT, host: "0.0.0.0" }).then((addr) => {
  app.log.info(`ConversationRelay server listening on ${addr}`);
});
