import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { ToolContext } from "./index.js";

export const switchLanguageSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "switch_language",
    description:
      "Switch the TTS and speech-recognition language for the remainder of the call. Use when the caller requests a different language.",
    parameters: {
      type: "object",
      properties: {
        ttsLanguage: {
          type: "string",
          description:
            "BCP-47 language code for text-to-speech, e.g. en-US, es-MX, fr-FR, hi-IN.",
        },
        transcriptionLanguage: {
          type: "string",
          description:
            "BCP-47 language code for speech transcription. Usually the same as ttsLanguage.",
        },
      },
      required: ["ttsLanguage", "transcriptionLanguage"],
    },
  },
};

interface Args {
  ttsLanguage: string;
  transcriptionLanguage: string;
}

export async function switchLanguage(args: Args, ctx: ToolContext) {
  ctx.sendRelay({
    type: "language",
    ttsLanguage: args.ttsLanguage,
    transcriptionLanguage: args.transcriptionLanguage,
  });
  return {
    ok: true,
    ttsLanguage: args.ttsLanguage,
    transcriptionLanguage: args.transcriptionLanguage,
  };
}
