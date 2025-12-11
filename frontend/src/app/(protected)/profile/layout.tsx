'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { FaUser, FaCog, FaShieldAlt } from 'react-icons/fa';

const sidebar = [
  { name: 'Public Profile', href: '/profile', icon: FaUser },
  { name: 'Account', href: '/profile/account', icon: FaCog },
  { name: 'Auth', href: '/profile/auth', icon: FaShieldAlt },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            <h2 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Settings
            </h2>
            {sidebar.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-l-2 border-blue-600 rounded-l-none'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'text-lg shrink-0',
                      isActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
