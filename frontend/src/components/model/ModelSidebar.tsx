'use client';

import { useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Pencil, Check, X, Loader2, Github, ExternalLink } from "lucide-react";

interface Contributor {
  username: string;
  avatar_url: string | null;
}

interface ModelSidebarProps {
  owner: string;
  repository: string;
  initialDescription?: string;
  contributors?: Contributor[];
  githubUrl?: string;
  canManage: boolean;
  tags?: {
    disease?: string;
    category?: string;
    adm_level?: number;
    time_resolution?: string;
    license?: string;
  };
}

export default function ModelSidebar({
  owner,
  repository,
  initialDescription,
  contributors,
  githubUrl,
  canManage,
  tags
}: ModelSidebarProps) {
  const { t } = useTranslation('common');
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription || "");
  const [loading, setLoading] = useState(false);

  const MAX_CHARS = 500;

  const getGithubUrl = () => {
    if (githubUrl) return githubUrl;

    let repoName = repository;

    if (/^d-fense(-\d+)?$/i.test(repository)) {
      repoName = "D-FENSE";
    } else if (/^dengue-oracle(-\d+)?$/i.test(repository)) {
      repoName = "dengue-oracle";
    }

    return `https://github.com/${owner}/${repoName}`;
  };

  const fallbackGithubUrl = getGithubUrl();

  const handleUpdateDescription = async () => {
    if (description.length > MAX_CHARS) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/registry/model/${owner}/${repository}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (res.ok) {
        setIsEditing(false);
      } else {
        const error = await res.json();
        console.error("Failed to update description:", error.error);
      }
    } catch (err) {
      console.error("Error patching description:", err);
    } finally {
      setLoading(false);
    }
  };

  const tagList = [
    {
      label: "Repository Owner",
      value: owner
    },
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
    {
      label: "License",
      value: tags?.license
    }
  ].filter(t => t.value);

  return (
    <div className="flex flex-col gap-5 w-full max-w-full">
      <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm overflow-hidden break-words relative group">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('model_sidebar.description')}
          </h3>
          {canManage && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-gray-400 hover:text-blue-600"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={description}
              maxLength={MAX_CHARS}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-2.5 bg-gray-50 dark:bg-neutral-900 border border-[var(--color-border)] rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] text-text resize-none"
              placeholder={t('model_sidebar.description_placeholder')}
              autoFocus
            />
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-medium ${description.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                {description.length} / {MAX_CHARS}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDescription(initialDescription || "");
                  }}
                  disabled={loading}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleUpdateDescription}
                  disabled={loading || description.length > MAX_CHARS}
                  className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text/80 leading-relaxed whitespace-pre-wrap">
            {description || t('model_sidebar.no_description')}
          </p>
        )}
      </div>

      <a
        href={fallbackGithubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-gray-50 dark:hover:bg-neutral-900 transition-all duration-200 group/link shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
            <Github size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Source Code</span>
            <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight">View Repository</span>
          </div>
        </div>
        <ExternalLink size={16} className="text-gray-400 group-hover/link:text-blue-500 group-hover/link:translate-x-0.5 transition-all" />
      </a>

      {tagList.length > 0 && (
        <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm overflow-hidden">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t('model_sidebar.metadata')}
          </h3>
          <div className="flex flex-col gap-3.5">
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
        <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm overflow-hidden">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t('model_sidebar.contributors')}
          </h3>
          <div className="flex flex-col gap-3">
            {contributors.map((c) => (
              <div key={c.username} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-hover shrink-0 relative">
                  {c.avatar_url ? (
                    <Image src={c.avatar_url} alt={c.username} width={32} height={32} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-gray-100 dark:bg-neutral-800">
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
