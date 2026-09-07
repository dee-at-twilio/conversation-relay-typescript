import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

// Strip any scheme, trailing slashes, or paths a user might have pasted in.
function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^\w+:\/\//, "").replace(/\/.*$/, "");
}

const DOMAIN = normalizeDomain(required("DOMAIN"));

export const config = {
  PORT: Number(process.env.PORT ?? 8080),
  DOMAIN,
  HTTP_BASE_URL: `https://${DOMAIN}`,
  WS_BASE_URL: `wss://${DOMAIN}`,

  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  TWILIO_ACCOUNT_SID: required("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: required("TWILIO_AUTH_TOKEN"),
  TWILIO_PHONE_NUMBER: required("TWILIO_PHONE_NUMBER"),
  HUMAN_AGENT_NUMBER: required("HUMAN_AGENT_NUMBER"),

  CR_WELCOME_GREETING:
    process.env.CR_WELCOME_GREETING ?? "Hi! How can I help you today?",
  CR_VOICE: process.env.CR_VOICE ?? "en-US-Journey-O",
  CR_LANGUAGE: process.env.CR_LANGUAGE ?? "en-US",
  CR_TTS_PROVIDER: process.env.CR_TTS_PROVIDER ?? "Google",
};
