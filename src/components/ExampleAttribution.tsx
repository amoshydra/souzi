import { useTranslation } from "react-i18next";
import type { ExampleSentence } from "../types";
import { exampleAttribution } from "../lib/example-sentences";

const KEYS = {
  tatoebaAndStarter: "entry.attributionTatoebaAndStarter",
  tatoeba: "entry.attributionTatoeba",
  starter: "entry.attributionStarter",
} as const;

export function ExampleAttribution({
  examples,
}: {
  examples: ExampleSentence[];
}) {
  const { t } = useTranslation();
  const attribution = exampleAttribution(examples);
  if (!attribution) return null;
  return <p className="content-attribution">{t(KEYS[attribution])}</p>;
}
