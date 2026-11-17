"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <SearchX className="mb-4 h-12 w-12 text-gray-400" />
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)]">
        {t("errors.not_found.title")}
      </h1>
      <p className="mt-3 text-sm text-gray-500">
        {t("errors.not_found.description")}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        {t("errors.not_found.back_home")}
      </Link>
    </div>
  );
}
