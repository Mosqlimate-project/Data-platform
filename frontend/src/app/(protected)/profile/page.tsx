'use client';

import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user, loadingUser } = useAuth();

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Public Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This is how others will see you on the site.
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-500 cursor-not-allowed">
                {loadingUser ? 'Loading...' : user?.first_name || user?.username}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your name appears on your public profile page.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-500 cursor-not-allowed">
                {loadingUser ? 'Loading...' : user?.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition h-24 resize-none"
                placeholder="Tell us a little bit about yourself"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Profile picture
            </label>
            <div className="h-48 w-48 rounded-full overflow-hidden border-4 border-gray-100 dark:border-neutral-800 shadow-sm relative group cursor-pointer">
              {loadingUser ? (
                <div className="animate-pulse bg-gray-200 dark:bg-neutral-800 w-full h-full" />
              ) : user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="bg-gray-200 dark:bg-neutral-800 w-full h-full flex items-center justify-center text-gray-500 text-2xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">Change</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700 flex justify-end">
          <button className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md transition-colors shadow-sm">
            Update profile
          </button>
        </div>
      </div>
    </div>
  );
}
