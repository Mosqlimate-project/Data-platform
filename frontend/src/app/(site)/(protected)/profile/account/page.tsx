'use client';

import { useTranslation } from 'react-i18next';

export default function AccountPage() {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile_account.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile_account.description')}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('profile_account.password_title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('profile_account.password_desc')}
          </p>
          <button disabled className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
            {t('profile_account.password_btn')}
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-medium text-red-600">
            {t('profile_account.delete_title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('profile_account.delete_desc')}
          </p>
          <button disabled className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
            {t('profile_account.delete_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
