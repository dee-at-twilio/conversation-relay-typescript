import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { OutMessage } from "../relay/types.js";
import { switchLanguage, switchLanguageSchema } from "./switchLanguage.js";
import { sendSms, sendSmsSchema } from "./sendSms.js";
import { handoverToHuman, handoverToHumanSchema } from "./handoverToHuman.js";

export interface ToolContext {
  callSid: string;
  from: string;
  to: string;
  sendRelay: (msg: OutMessage) => void;
  // Mutated by tools that terminate the session (e.g. handover) so the
  // LLM loop stops issuing more turns after the WebSocket is torn down.
  ended: { value: boolean };
}

export type ToolHandler = (args: any, ctx: ToolContext) => Promise<unknown>;

export const toolSchemas: ChatCompletionTool[] = [
  switchLanguageSchema,
  sendSmsSchema,
  handoverToHumanSchema,
];

const handlers: Record<string, ToolHandler> = {
  switch_language: switchLanguage as ToolHandler,
  send_sms: sendSms as ToolHandler,
  handover_to_human: handoverToHuman as ToolHandler,
};

export async function executeTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<unknown> {
  const fn = handlers[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    return await fn(args, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
