import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { config } from "../config.js";
import { executeTool, toolSchemas, type ToolContext } from "../tools/index.js";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export type TokenSink = (token: string, last: boolean) => void;

interface StreamedToolCall {
  id: string;
  name: string;
  args: string;
}

const MAX_HOPS = 5;

/**
 * Run one caller turn: stream tokens back to Twilio, loop through any
 * tool calls the model requests, and append everything to `history`.
 */
export async function runTurn(
  history: ChatCompletionMessageParam[],
  ctx: ToolContext,
  onToken: TokenSink,
): Promise<void> {
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (ctx.ended.value) return;

    const stream = await client.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: history,
      tools: toolSchemas,
      stream: true,
    });

    let assistantText = "";
    const toolCalls: Record<number, StreamedToolCall> = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        assistantText += delta.content;
        onToken(delta.content, false);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const acc = (toolCalls[idx] ??= { id: "", name: "", args: "" });
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.args += tc.function.arguments;
        }
      }
    }

    const calls = Object.values(toolCalls);

    if (calls.length === 0) {
      history.push({ role: "assistant", content: assistantText });
      onToken("", true);
      return;
    }

    history.push({
      role: "assistant",
      content: assistantText.length > 0 ? assistantText : null,
      tool_calls: calls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    });

    for (const call of calls) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(call.args || "{}");
      } catch {
        parsed = {};
      }
      const result = await executeTool(call.name, parsed, ctx);
      history.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result ?? {}),
      });
    }
  }

  onToken("Sorry, I got stuck. Let me transfer you.", true);
}
