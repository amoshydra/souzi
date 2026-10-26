export function speakChinese(text: string): boolean {
  if (!("speechSynthesis" in window)) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const chineseVoice =
    voices.find((voice) => voice.lang === "zh-CN") ??
    voices.find((voice) => voice.lang.startsWith("zh"));
  if (chineseVoice) utterance.voice = chineseVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function speakEnglish(text: string): boolean {
  if (!("speechSynthesis" in window)) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.startsWith("en"));
  if (englishVoice) utterance.voice = englishVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
