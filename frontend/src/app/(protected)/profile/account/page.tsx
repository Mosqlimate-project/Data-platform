'use client';

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your login methods and delete your account.
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Change Password
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Update the password associated with your account.
          </p>
          <button className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
            Update password
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-medium text-red-600">
            Delete Account
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Permanently remove your account and all associated data. This action cannot be undone.
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
