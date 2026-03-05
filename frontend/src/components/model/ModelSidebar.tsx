'use client';

import Image from "next/image";
import { useTranslation } from "next-i18next";

interface Contributor {
  username: string;
  avatar_url: string | null;
}

interface ModelSidebarProps {
  owner: string;
  repository: string;
  initialDescription?: string;
  contributors?: Contributor[];
  canManage: boolean;
  tags?: {
    disease?: string;
    category?: string;
    adm_level?: number;
    time_resolution?: string;
  };
}

export default function ModelSidebar({
  initialDescription,
  contributors,
  tags
}: ModelSidebarProps) {
  const { t } = useTranslation('common');

  const tagList = [
    {
      label: t('model_sidebar.tags.disease'),
      value: tags?.disease
    },
    {
      label: t('model_sidebar.tags.category'),
      value: tags?.category
    },
    {
      label: t('model_sidebar.tags.admin_level'),
      value: tags?.adm_level !== undefined ? `ADM ${tags.adm_level}` : null
    },
    {
      label: t('model_sidebar.tags.resolution'),
      value: tags?.time_resolution
    },
  ].filter(t => t.value);

  return (
    <div className="flex flex-col gap-4 w-full max-w-full">
      <div className="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden break-words">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
          {t('model_sidebar.description')}
        </h3>
        <p className="text-sm text-text/80 leading-relaxed whitespace-pre-wrap">
          {initialDescription || t('model_sidebar.no_description')}
        </p>
      </div>

      {tagList.length > 0 && (
        <div className="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            {t('model_sidebar.metadata')}
          </h3>
          <div className="flex flex-col gap-4">
            {tagList.map((tag) => (
              <div key={tag.label} className="flex flex-col border-b border-[var(--color-border)] last:border-0 pb-3 last:pb-0">
                <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">
                  {tag.label}
                </span>
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {tag.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {contributors && contributors.length > 0 && (
        <div className="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            {t('model_sidebar.contributors')}
          </h3>
          <div className="flex flex-col gap-3">
            {contributors.map((c) => (
              <div key={c.username} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-hover shrink-0">
                  {c.avatar_url ? (
                    <Image src={c.avatar_url} alt={c.username} width={32} height={32} />
                  ) : (
                    <div className="w-full h-full flex items-center center text-[10px] font-bold">
                      {c.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-text/80 truncate">{c.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
