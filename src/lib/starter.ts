import hskLevels from "../data/hsk30.json";
import type { Entry } from "../types";
import { COMMON_FREQUENCY } from "./common";
import { toPlainPinyin } from "./pinyin";

type StarterRow = {
  simp: string;
  trad: string;
  pinyin: string;
  definitions: string[];
  classifiers?: string[];
};

const STARTER_ROWS: StarterRow[] = [
  {
    simp: "你好",
    trad: "你好",
    pinyin: "nǐ hǎo",
    definitions: ["hello", "hi"],
  },
  {
    simp: "谢谢",
    trad: "謝謝",
    pinyin: "xiè xie",
    definitions: ["thank you", "thanks"],
  },
  {
    simp: "再见",
    trad: "再見",
    pinyin: "zài jiàn",
    definitions: ["goodbye", "see you again"],
  },
  {
    simp: "中国",
    trad: "中國",
    pinyin: "zhōng guó",
    definitions: ["China"],
  },
  {
    simp: "中文",
    trad: "中文",
    pinyin: "zhōng wén",
    definitions: ["Chinese language", "written Chinese"],
  },
  {
    simp: "学习",
    trad: "學習",
    pinyin: "xué xí",
    definitions: ["to study", "to learn"],
  },
  {
    simp: "朋友",
    trad: "朋友",
    pinyin: "péng you",
    definitions: ["friend"],
  },
  {
    simp: "银行",
    trad: "銀行",
    pinyin: "yín háng",
    definitions: ["bank", "financial institution"],
    classifiers: ["家"],
  },
  {
    simp: "钱",
    trad: "錢",
    pinyin: "qián",
    definitions: ["money", "cash"],
  },
  {
    simp: "水",
    trad: "水",
    pinyin: "shuǐ",
    definitions: ["water"],
  },
  {
    simp: "火",
    trad: "火",
    pinyin: "huǒ",
    definitions: ["fire"],
  },
  {
    simp: "山",
    trad: "山",
    pinyin: "shān",
    definitions: ["mountain", "hill"],
  },
  {
    simp: "人",
    trad: "人",
    pinyin: "rén",
    definitions: ["person", "people"],
    classifiers: ["个"],
  },
  {
    simp: "书",
    trad: "書",
    pinyin: "shū",
    definitions: ["book"],
    classifiers: ["本"],
  },
  {
    simp: "吃",
    trad: "吃",
    pinyin: "chī",
    definitions: ["to eat"],
  },
  {
    simp: "喝",
    trad: "喝",
    pinyin: "hē",
    definitions: ["to drink"],
  },
  {
    simp: "看",
    trad: "看",
    pinyin: "kàn",
    definitions: ["to look", "to watch", "to read"],
  },
  {
    simp: "听",
    trad: "聽",
    pinyin: "tīng",
    definitions: ["to listen", "to hear"],
  },
  {
    simp: "说",
    trad: "說",
    pinyin: "shuō",
    definitions: ["to speak", "to say"],
  },
  {
    simp: "大",
    trad: "大",
    pinyin: "dà",
    definitions: ["big", "large"],
  },
  {
    simp: "小",
    trad: "小",
    pinyin: "xiǎo",
    definitions: ["small", "little"],
  },
  {
    simp: "好",
    trad: "好",
    pinyin: "hǎo",
    definitions: ["good", "well"],
  },
  {
    simp: "爱",
    trad: "愛",
    pinyin: "ài",
    definitions: ["to love", "love"],
  },
  {
    simp: "家",
    trad: "家",
    pinyin: "jiā",
    definitions: ["home", "family"],
    classifiers: ["家"],
  },
  {
    simp: "学校",
    trad: "學校",
    pinyin: "xué xiào",
    definitions: ["school"],
    classifiers: ["所"],
  },
  {
    simp: "老师",
    trad: "老師",
    pinyin: "lǎo shī",
    definitions: ["teacher"],
  },
  {
    simp: "学生",
    trad: "學生",
    pinyin: "xué sheng",
    definitions: ["student", "pupil"],
  },
  {
    simp: "医生",
    trad: "醫生",
    pinyin: "yī shēng",
    definitions: ["doctor", "physician"],
  },
  {
    simp: "今天",
    trad: "今天",
    pinyin: "jīn tiān",
    definitions: ["today"],
  },
  {
    simp: "明天",
    trad: "明天",
    pinyin: "míng tiān",
    definitions: ["tomorrow"],
  },
  {
    simp: "茶",
    trad: "茶",
    pinyin: "chá",
    definitions: ["tea"],
  },
  {
    simp: "咖啡",
    trad: "咖啡",
    pinyin: "kā fēi",
    definitions: ["coffee"],
  },
  {
    simp: "工作",
    trad: "工作",
    pinyin: "gōng zuò",
    definitions: ["work", "job", "to work"],
  },
  {
    simp: "时间",
    trad: "時間",
    pinyin: "shí jiān",
    definitions: ["time"],
  },
  {
    simp: "厕所",
    trad: "廁所",
    pinyin: "cè suǒ",
    definitions: ["toilet", "restroom"],
    classifiers: ["间"],
  },
  {
    simp: "饭",
    trad: "飯",
    pinyin: "fàn",
    definitions: ["meal", "cooked rice"],
    classifiers: ["顿"],
  },
];

export const STARTER_ENTRIES: Entry[] = STARTER_ROWS.map((row, index) => ({
  id: index + 1,
  simp: row.simp,
  trad: row.trad,
  pinyin: row.pinyin,
  pinyinPlain: toPlainPinyin(row.pinyin),
  definitions: row.definitions,
  classifiers: row.classifiers ?? [],
  source: "starter",
  hsk: (hskLevels as Record<string, number>)[row.simp],
  frequency: COMMON_FREQUENCY[row.simp] ?? 1000 + index,
}));
