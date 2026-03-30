'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Github,
  Gitlab,
  Box,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileModel {
  id: number;
  name: string;
  owner: string;
  provider: string;
  category: string;
  can_manage: boolean;
  active: boolean;
}

export default function ModelsPage() {
  const { t } = useTranslation('common');
  const [models, setModels] = useState<ProfileModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmName, setConfirmName] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; model: ProfileModel | null }>({
    isOpen: false,
    model: null,
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/user/profile/models/');
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        }
      } catch (error) {
        console.error("Failed to fetch models", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleToggleActive = async (model: ProfileModel) => {
    const newStatus = !model.active;

    try {
      const res = await fetch(`/api/registry/model/${model.owner}/${model.name}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: newStatus,
        }),
      });

      if (res.ok) {
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, active: newStatus } : m));
      } else {
        const errorData = await res.json();
        console.error("Failed to update status:", errorData.error || errorData.message);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const closeModal = () => {
    setDeleteModal({ isOpen: false, model: null });
    setConfirmName('');
  };

  const handleDelete = async () => {
    if (!deleteModal.model || confirmName !== deleteModal.model.name) return;

    try {
      const res = await fetch(`/api/registry/model/${deleteModal.model.owner}/${deleteModal.model.name}/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setModels(prev => prev.filter(m => m.id !== deleteModal.model?.id));
        closeModal();
      } else {
        const errorData = await res.json();
        console.error("Failed to delete model:", errorData.error || errorData.message);
      }
    } catch (error) {
      console.error("Error deleting model:", error);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'github':
        return <Github size={16} className="text-gray-700 dark:text-gray-300" />;
      case 'gitlab':
        return <Gitlab size={16} className="text-orange-600" />;
      default:
        return <Box size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile_models.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile_models.description')}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Box className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile_models.empty_title')}</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              {t('profile_models.empty_desc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{t('profile_models.table.name')}</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{t('profile_models.table.category')}</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-center w-32">{t('profile_models.table.status')}</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-center w-24">{t('profile_models.table.delete')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {models.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
                          {getProviderIcon(model.provider)}
                        </div>
                        <div>
                          <Link
                            href={`/${model.owner}/${model.name}/`}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                          >
                            {model.name}
                          </Link>
                          <div className="text-xs text-gray-500 font-mono">
                            {model.owner}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {model.category}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {model.can_manage ? (
                        <button
                          onClick={() => handleToggleActive(model)}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${model.active
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700'
                            }`}
                          title={model.active ? t('profile_models.status.click_to_deactivate') : t('profile_models.status.click_to_activate')}
                        >
                          {model.active ? (
                            <>
                              <CheckCircle2 size={12} />
                              {t('profile_models.status.active')}
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              {t('profile_models.status.inactive')}
                            </>
                          )}
                        </button>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${model.active
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700'
                          }`}>
                          {model.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {model.active ? t('profile_models.status.active') : t('profile_models.status.inactive')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {model.can_manage ? (
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, model })}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={24} className="shrink-0" />
                <h2 className="text-xl font-bold">{t('profile_models.modal.title')}</h2>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {t('profile_models.modal.description')}
                <span className="mx-1 font-mono font-bold text-gray-900 dark:text-white underline decoration-red-500">
                  {deleteModal.model?.name}
                </span>
              </p>

              <input
                type="text"
                autoFocus
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={t('profile_models.modal.placeholder')}
                className="mt-4 w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all dark:text-white"
              />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  {t('profile_models.modal.cancel')}
                </button>
                <button
                  disabled={confirmName !== deleteModal.model?.name}
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-lg shadow-red-500/20"
                >
                  {t('profile_models.modal.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
