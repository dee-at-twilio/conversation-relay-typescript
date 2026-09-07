import type { WebSocket } from "ws";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runTurn } from "../llm/openai.js";
import { SYSTEM_PROMPT } from "../systemPrompt.js";
import type { ToolContext } from "../tools/index.js";
import type { OutMessage, RelayEvent, RelaySetup } from "./types.js";

export function handleConnection(ws: WebSocket): void {
  const history: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  let setup: RelaySetup | null = null;
  const ended = { value: false };

  const send = (msg: OutMessage) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const buildCtx = (): ToolContext => ({
    callSid: setup?.callSid ?? "",
    from: setup?.from ?? "",
    to: setup?.to ?? "",
    sendRelay: send,
    ended,
  });

  ws.on("message", async (raw) => {
    let event: RelayEvent;
    try {
      event = JSON.parse(raw.toString()) as RelayEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case "setup":
        setup = event;
        console.log(
          `[cr] setup call=${event.callSid} from=${event.from} to=${event.to}`,
        );
        break;

      case "prompt": {
        // Ignore interim partials — respond only when the caller finishes.
        if (event.last === false) return;
        history.push({ role: "user", content: event.voicePrompt });
        try {
          await runTurn(history, buildCtx(), (token, last) => {
            send({ type: "text", token, last });
          });
        } catch (err) {
          console.error("[cr] llm error", err);
          send({
            type: "text",
            token: "Sorry, something went wrong on my end.",
            last: true,
          });
        }
        break;
      }

      case "interrupt": {
        console.log(
          `[cr] interrupt after "${event.utteranceUntilInterrupt}" (${event.durationUntilInterruptMs}ms)`,
        );
        // Truncate the last assistant turn so history reflects what the caller heard.
        const lastMsg = history[history.length - 1];
        if (
          lastMsg &&
          lastMsg.role === "assistant" &&
          typeof lastMsg.content === "string"
        ) {
          lastMsg.content = event.utteranceUntilInterrupt;
        }
        break;
      }

      case "dtmf":
        console.log(`[cr] dtmf ${event.digit}`);
        // Surface DTMF to the model as a user-side signal, so tools can react.
        history.push({
          role: "user",
          content: `(caller pressed keypad digit: ${event.digit})`,
        });
        break;

      case "error":
        console.error(`[cr] error from Twilio: ${event.description}`);
        break;
    }
  });

  ws.on("close", () => {
    ended.value = true;
    console.log(`[cr] closed call=${setup?.callSid ?? "?"}`);
  });

  ws.on("error", (err) => {
    console.error("[cr] ws error", err);
  });
}
