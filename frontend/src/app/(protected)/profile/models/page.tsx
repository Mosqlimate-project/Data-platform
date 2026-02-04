'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Settings,
  CheckCircle2,
  XCircle,
  Github,
  Gitlab,
  Box,
} from 'lucide-react';

interface ProfileModel {
  id: number;
  name: string;
  owner: string;
  provider: string;
  category: string;
  disease: string;
  can_manage: boolean;
  active: boolean;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ProfileModel[]>([]);
  const [loading, setLoading] = useState(true);

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
          Models
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Models you own, contribute to, or maintain within an organization.
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No models found</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              You haven't linked any models yet. Connect a repository to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">Disease</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">Category</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-center">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white text-right">Actions</th>
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {model.disease}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {model.category}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {model.active ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <CheckCircle2 size={12} />
                          Active
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 border border-gray-200 dark:border-neutral-700">
                          <XCircle size={12} />
                          Inactive
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {model.can_manage ? (
                        <button
                          disabled
                          title="Management dashboard coming soon"
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed dark:bg-neutral-900 dark:text-gray-600 dark:border-neutral-800"
                        >
                          <Settings size={14} />
                          Manage
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1">
                          View Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
