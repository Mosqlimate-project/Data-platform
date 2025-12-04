'use client';

import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user, loadingUser } = useAuth();

  return (
    <div className="max-w-md mx-auto p-6 bg-[var(--color-bg)] rounded-2xl shadow border border-gray-200 dark:border-neutral-700">
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-md mb-4">
          {loadingUser ? (
            <div className="animate-pulse bg-gray-200 dark:bg-neutral-800 w-full h-full" />
          ) : user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="object-cover w-full h-full" />
          ) : (
            <div className="bg-gray-200 dark:bg-neutral-800 w-full h-full flex items-center justify-center text-gray-500 text-sm">
              No avatar
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-1">
          {loadingUser ? (
            <span className="inline-block h-6 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded" />
          ) : (
            user?.username
          )}
        </h1>
        <div className="text-gray-500 dark:text-gray-400">
          {loadingUser ? (
            <span className="inline-block h-4 w-48 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded" />
          ) : (
            user?.email
          )}
        </div>
      </div>
    </div>
  );
}
