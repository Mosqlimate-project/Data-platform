'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="text-xl font-semibold">Mosqlimate</div>
      <div className="flex gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'text-gray-600 hover:text-black transition-colors',
              pathname === link.href && 'text-black font-medium'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
