// Types for the ConversationRelay WebSocket protocol.
// https://www.twilio.com/docs/voice/conversationrelay/websocket-messages

// ---- Incoming (Twilio -> our app) ----

export interface RelaySetup {
  type: "setup";
  sessionId: string;
  callSid: string;
  parentCallSid?: string;
  accountSid: string;
  from: string;
  to: string;
  forwardedFrom?: string;
  callType?: string;
  callerName?: string;
  direction: string;
  callStatus: string;
  customParameters?: Record<string, string>;
}

export interface RelayPrompt {
  type: "prompt";
  voicePrompt: string;
  lang: string;
  last: boolean;
}

export interface RelayInterrupt {
  type: "interrupt";
  utteranceUntilInterrupt: string;
  durationUntilInterruptMs: number;
}

export interface RelayDtmf {
  type: "dtmf";
  digit: string;
}

export interface RelayError {
  type: "error";
  description: string;
}

export type RelayEvent =
  | RelaySetup
  | RelayPrompt
  | RelayInterrupt
  | RelayDtmf
  | RelayError;

// ---- Outgoing (our app -> Twilio) ----

export interface OutText {
  type: "text";
  token: string;
  last: boolean;
  lang?: string;
  interruptible?: boolean;
  preemptible?: boolean;
}

export interface OutPlay {
  type: "play";
  source: string;
  loop?: number;
  preemptible?: boolean;
  interruptible?: boolean;
}

export interface OutSendDigits {
  type: "sendDigits";
  digits: string;
}

export interface OutLanguage {
  type: "language";
  ttsLanguage: string;
  transcriptionLanguage: string;
}

export interface OutEnd {
  type: "end";
  handoffData?: string;
}

export type OutMessage =
  | OutText
  | OutPlay
  | OutSendDigits
  | OutLanguage
  | OutEnd;
