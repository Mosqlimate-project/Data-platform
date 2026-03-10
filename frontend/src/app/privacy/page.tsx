'use client';

import { useTranslation } from "react-i18next";
import {
  Database,
  User,
  Shield,
  Cookie,
  Share2,
  Lock,
  Globe,
  Gavel,
  AlertCircle,
  RefreshCw
} from "lucide-react";

const icons: Record<string, React.ReactNode> = {
  dataCollected: <Database className="text-blue-500" />,
  purpose: <User className="text-green-500" />,
  legalBasis: <Gavel className="text-purple-500" />,
  cookies: <Cookie className="text-orange-500" />,
  sharing: <Share2 className="text-indigo-500" />,
  internationalTransfer: <Globe className="text-cyan-500" />,
  security: <Lock className="text-red-500" />,
  retention: <Database className="text-yellow-500" />,
  rights: <User className="text-pink-500" />,
  dpo: <Shield className="text-gray-500" />,
  changes: <RefreshCw className="text-blue-500" />
};

const sectionKeys = [
  "dataCollected",
  "purpose",
  "legalBasis",
  "cookies",
  "sharing",
  "internationalTransfer",
  "security",
  "retention",
  "rights",
  "dpo",
  "changes"
];

export default function PrivacyTermsPage() {
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-12">

        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
            {t("privacy.title")}
          </h1>

          <p className="text-[var(--color-text)] opacity-60">
            {t("privacy.effectiveDate")}
          </p>
        </header>

        <section className="bg-[var(--color-hover)] p-6 rounded-xl border border-blue-500/20 flex gap-4">
          <AlertCircle className="text-blue-500 shrink-0" size={24} />
          <p className="text-sm text-[var(--color-text)] opacity-80 italic">
            {t("privacy.summary")}
          </p>
        </section>

        <div className="space-y-10">
          {sectionKeys.map((key) => (
            <Section
              key={key}
              icon={icons[key]}
              title={t(`privacy.sections.${key}.title`)}
              content={t(`privacy.sections.${key}.content`)}
            />
          ))}
        </div>

        <footer className="pt-10 border-t border-[var(--color-border)] text-center">
          <p className="text-sm text-[var(--color-text)] opacity-50">
            {t("privacy.footer")}
          </p>
        </footer>

      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  content
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="mt-1">{icon}</div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[var(--color-text)]">
          {title}
        </h2>

        <p className="text-[var(--color-text)] opacity-70 leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
}
