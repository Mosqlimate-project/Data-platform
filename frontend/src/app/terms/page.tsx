'use client';

import { useTranslation } from 'react-i18next';
import {
  Shield,
  UserCheck,
  Image,
  ExternalLink,
  AlertCircle,
  FileText,
  Ban,
  Gavel,
  RefreshCw
} from 'lucide-react';

const icons: Record<string, React.ReactNode> = {
  acceptance: <FileText className="text-blue-500" />,
  accounts: <UserCheck className="text-green-500" />,
  oauth: <Shield className="text-cyan-500" />,
  content: <Image className="text-purple-500" />,
  acceptableUse: <Ban className="text-red-500" />,
  externalLinks: <ExternalLink className="text-orange-500" />,
  intellectualProperty: <Shield className="text-indigo-500" />,
  availability: <AlertCircle className="text-yellow-500" />,
  warranty: <AlertCircle className="text-red-500" />,
  liability: <Shield className="text-pink-500" />,
  law: <Gavel className="text-gray-500" />,
  changes: <RefreshCw className="text-blue-500" />
};

const sectionKeys = [
  'acceptance',
  'accounts',
  'oauth',
  'content',
  'acceptableUse',
  'externalLinks',
  'intellectualProperty',
  'availability',
  'warranty',
  'liability',
  'law',
  'changes'
];

export default function TOSPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-12">

        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[var(--color-text)] tracking-tight">
            {t('tos.title')}
          </h1>

          <p className="text-[var(--color-text)] opacity-60">
            {t('tos.effectiveDate')}
          </p>
        </header>

        <section className="bg-[var(--color-hover)] p-6 rounded-xl border border-blue-500/20 flex gap-4">
          <AlertCircle className="text-blue-500 shrink-0" size={24} />
          <p className="text-sm text-[var(--color-text)] opacity-80 italic">
            {t('tos.summary')}
          </p>
        </section>

        <div className="space-y-10">
          {sectionKeys.map((key) => (
            <Section
              key={key}
              icon={icons[key]}
              title={t(`tos.sections.${key}.title`)}
              content={t(`tos.sections.${key}.content`)}
            />
          ))}
        </div>

        <footer className="pt-10 border-t border-[var(--color-border)] text-center">
          <p className="text-sm text-[var(--color-text)] opacity-50">
            {t('tos.footer')}
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
  icon: React.ReactNode
  title: string
  content: string
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
