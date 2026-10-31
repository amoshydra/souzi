import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Keep the document title in sync with the current route and UI language.
 * Entry pages pass the headword; other pages pass a translated page name.
 */
export function useDocumentTitle(page?: string): void {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = page
      ? t("meta.titleWithPage", { page })
      : t("meta.title");
  }, [page, t, i18n.resolvedLanguage]);
}
