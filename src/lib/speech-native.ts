import { Capacitor, registerPlugin } from "@capacitor/core";

export type SpeakResult = { ok: boolean; reason?: string };

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
    return { ok: false, reason: "No speech engine available in this browser." };
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
      const reason =
        error instanceof Error && error.message
          ? error.message
          : "Speech engine is not available.";
      return { ok: false, reason };
    }
  }
  return { ok: false, reason: "No speech engine available on this device." };
}
