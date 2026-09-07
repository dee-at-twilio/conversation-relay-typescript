import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { ToolContext } from "./index.js";

export const handoverToHumanSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "handover_to_human",
    description:
      "End the AI session and transfer the caller to a human agent. Use when the caller asks for a human, or when the request is clearly out of scope.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Short reason for the transfer, for logging.",
        },
        summary: {
          type: "string",
          description:
            "Brief context to hand to the human agent (topic, what was tried, caller mood).",
        },
      },
      required: ["reason"],
    },
  },
};

interface Args {
  reason: string;
  summary?: string;
}

export async function handoverToHuman(args: Args, ctx: ToolContext) {
  ctx.sendRelay({
    type: "end",
    handoffData: JSON.stringify({
      reason: args.reason,
      summary: args.summary ?? "",
      from: ctx.from,
      callSid: ctx.callSid,
    }),
  });
  ctx.ended.value = true;
  return { ok: true, handoff: true };
}
