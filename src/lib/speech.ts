import { speakText } from "./speech-native";
import type { SpeakResult } from "./speech-native";

export async function speakChinese(text: string): Promise<SpeakResult> {
  return speakText(text, "zh-CN");
}

export async function speakEnglish(text: string): Promise<SpeakResult> {
  return speakText(text, "en-US");
}
