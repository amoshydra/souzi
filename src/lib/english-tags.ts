export const ENGLISH_TAG_LABELS: Record<string, string> = {
  zk: "中考",
  gk: "高考",
  cet4: "CET-4",
  cet6: "CET-6",
  ky: "考研",
  toefl: "TOEFL",
  ielts: "IELTS",
  gre: "GRE",
};

export function englishTagLabel(tag: string): string {
  return ENGLISH_TAG_LABELS[tag.toLowerCase()] ?? tag.toUpperCase();
}
