import { Capacitor, registerPlugin } from "@capacitor/core";

export type SpeechPluginInterface = {
  status(): Promise<{ ready?: boolean; failed?: boolean }>;
  speak(options: { text: string; lang: "zh-CN" | "en-US" }): Promise<void>;
  stop(): Promise<void>;
};

const native = Capacitor.isNativePlatform()
  ? registerPlugin<SpeechPluginInterface>("SouziSpeech")
  : null;

/** Aerospace utterance fallbacks on the web talk through Web Speech. */
function webSpeak(
  text: string,
  lang: "zh-CN" | "en-US",
  rate: number,
): boolean {
  if (!("speechSynthesis" in window)) return false;

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
  return true;
}

export async function speakText(
  text: string,
  lang: "zh-CN" | "en-US",
): Promise<boolean> {
  if (native) {
    try {
      await native.speak({ text, lang });
      return true;
    } catch {
      return false;
    }
  }
  return webSpeak(text, lang, lang === "en-US" ? 0.9 : 0.85);
}
