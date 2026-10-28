import { speakText } from "./speech-native";

export async function speakChinese(text: string): Promise<boolean> {
  return speakText(text, "zh-CN");
}

export async function speakEnglish(text: string): Promise<boolean> {
  return speakText(text, "en-US");
}
