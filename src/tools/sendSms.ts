import twilio from "twilio";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { config } from "../config.js";
import type { ToolContext } from "./index.js";

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export const sendSmsSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "send_sms",
    description:
      "Send an SMS to the caller (or a specified E.164 number). Useful for delivering links, confirmations, or a summary of what was discussed.",
    parameters: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description: "The plain-text message to send.",
        },
        to: {
          type: "string",
          description:
            "E.164 number to send to. Defaults to the caller's number when omitted.",
        },
      },
      required: ["body"],
    },
  },
};

interface Args {
  body: string;
  to?: string;
}

export async function sendSms(args: Args, ctx: ToolContext) {
  const to = args.to ?? ctx.from;
  const message = await client.messages.create({
    from: config.TWILIO_PHONE_NUMBER,
    to,
    body: args.body,
  });
  return { ok: true, sid: message.sid, to };
}
