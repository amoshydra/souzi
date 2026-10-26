import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastMessage = {
  message: string;
  tone?: "default" | "error";
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.tone === "error" ? (
        <XCircle size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={18} aria-hidden="true" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}
