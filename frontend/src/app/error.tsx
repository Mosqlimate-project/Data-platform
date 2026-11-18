"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        500
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)]">
        {t("errors.server_error.title")}
      </h1>
      <p className="mt-3 text-sm text-gray-500">
        {t("errors.server_error.description")}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          {t("errors.server_error.retry")}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-accent)] hover:text-white"
        >
          {t("errors.server_error.back_home")}
        </Link>
      </div>
    </div>
  );
}
