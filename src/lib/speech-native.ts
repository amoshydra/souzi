import { Capacitor, registerPlugin } from "@capacitor/core";
import { AppError } from "../i18n/errors";

export type SpeakResult =
  | { ok: true }
  | { ok: false; error: AppError };

export type SpeechPluginInterface = {
  status(): Promise<{ ready?: boolean; failed?: boolean }>;
  speak(options: { text: string; lang: "zh-CN" | "en-US" }): Promise<void>;
  stop(): Promise<void>;
};

const native = Capacitor.isNativePlatform()
  ? registerPlugin<SpeechPluginInterface>("SouziSpeech")
  : null;

function webSpeak(
  text: string,
  lang: "zh-CN" | "en-US",
  rate: number,
): SpeakResult {
  if (!("speechSynthesis" in window)) {
    return { ok: false, error: new AppError("errors.speechNoEngine") };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.split("-")[0];
  const voice =
    voices.find((item) => item.lang === lang) ??
    voices.find((item) => item.lang.startsWith(prefix));
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export async function speakText(
  text: string,
  lang: "zh-CN" | "en-US",
): Promise<SpeakResult> {
  // Prefer the WebView engine when it exists.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return webSpeak(text, lang, lang === "en-US" ? 0.9 : 0.85);
  }
  if (native) {
    try {
      await native.speak({ text, lang });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: new AppError("errors.speechUnavailable", undefined, {
          cause: error,
        }),
      };
    }
  }
  return { ok: false, error: new AppError("errors.speechNoEngine") };
}
