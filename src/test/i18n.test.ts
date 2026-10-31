import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { en } from "../i18n/locales/en";
import { zhHans } from "../i18n/locales/zh-Hans";
import { zhHant } from "../i18n/locales/zh-Hant";
import { ensureLocale, i18n, resolveLocale } from "../i18n";
import { formatCount } from "../lib/format";

type Catalog = Record<string, unknown>;

function flatten(value: Catalog, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      out[path] = child;
    } else if (child && typeof child === "object") {
      Object.assign(out, flatten(child as Catalog, path));
    }
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)]
    .map((match) => match[1])
    .sort();
}

const catalogs = {
  en: flatten(en as unknown as Catalog),
  "zh-Hans": flatten(zhHans as unknown as Catalog),
  "zh-Hant": flatten(zhHant as unknown as Catalog),
};

describe("resolveLocale", () => {
  it("maps English language tags", () => {
    expect(resolveLocale(["en-GB"])).toBe("en");
    expect(resolveLocale(["en"])).toBe("en");
  });

  it("maps Simplified and Traditional Chinese tags", () => {
    expect(resolveLocale(["zh-CN"])).toBe("zh-Hans");
    expect(resolveLocale(["zh-SG"])).toBe("zh-Hans");
    expect(resolveLocale(["zh-TW"])).toBe("zh-Hant");
    expect(resolveLocale(["zh-HK"])).toBe("zh-Hant");
    expect(resolveLocale(["zh-Hant"])).toBe("zh-Hant");
  });

  it("uses the first supported language and falls back to English", () => {
    expect(resolveLocale(["fr-FR", "zh-TW", "en"])).toBe("zh-Hant");
    expect(resolveLocale(["fr-FR"])).toBe("en");
    expect(resolveLocale([])).toBe("en");
  });
});

describe("catalogs", () => {
  it("have the same keys", () => {
    const englishKeys = Object.keys(catalogs.en).sort();
    expect(Object.keys(catalogs["zh-Hans"]).sort()).toEqual(englishKeys);
    expect(Object.keys(catalogs["zh-Hant"]).sort()).toEqual(englishKeys);
  });

  it("keep interpolation placeholders aligned", () => {
    for (const [key, english] of Object.entries(catalogs.en)) {
      const expected = placeholders(english);
      expect(placeholders(catalogs["zh-Hans"][key]), `${key} (zh-Hans)`).toEqual(
        expected,
      );
      expect(placeholders(catalogs["zh-Hant"][key]), `${key} (zh-Hant)`).toEqual(
        expected,
      );
    }
  });

  it("pair every plural key with _other", () => {
    for (const key of Object.keys(catalogs.en)) {
      if (!key.endsWith("_one")) continue;
      const other = `${key.slice(0, -"_one".length)}_other`;
      expect(catalogs.en, other).toHaveProperty(other);
      expect(catalogs["zh-Hans"], other).toHaveProperty(other);
      expect(catalogs["zh-Hant"], other).toHaveProperty(other);
    }
  });
});

describe("translation", () => {
  it("pluralizes counts for English and Chinese", async () => {
    const instance = createInstance();
    await instance.init({
      resources: {
        en: { translation: en },
        "zh-Hans": { translation: zhHans },
        "zh-Hant": { translation: zhHant },
      },
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      initAsync: false,
    });

    expect(instance.t("search.resultCount", { count: 1 })).toBe("1 word");
    expect(instance.t("search.resultCount", { count: 2 })).toBe("2 words");

    await instance.changeLanguage("zh-Hans");
    expect(instance.t("search.resultCount", { count: 1 })).toBe("1 个词语");
    expect(instance.t("search.resultCount", { count: 2 })).toBe("2 个词语");

    await instance.changeLanguage("zh-Hant");
    expect(instance.t("search.resultCount", { count: 2 })).toBe("2 個詞語");
  });
});

describe("formatCount", () => {
  it("uses the requested locale", () => {
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(1234, "zh-Hans")).toBe("1,234");
  });
});

describe("lazy locale loading", () => {
  it("loads a non-English catalog on demand", async () => {
    expect(i18n.hasResourceBundle("zh-Hans", "translation")).toBe(false);

    await ensureLocale("zh-Hans");
    expect(i18n.hasResourceBundle("zh-Hans", "translation")).toBe(true);

    await i18n.changeLanguage("zh-Hans");
    expect(i18n.t("nav.settings")).toBe("设置");

    await i18n.changeLanguage("en");
  });
});
