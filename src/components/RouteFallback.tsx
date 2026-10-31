import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export function RouteFallback() {
  const { t } = useTranslation();

  return (
    <div className="page route-fallback" role="status" aria-live="polite">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>{t("common.loading")}</span>
    </div>
  );
}
