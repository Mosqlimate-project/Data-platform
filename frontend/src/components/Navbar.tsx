'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import LanguageSelector from "../components/Language";
import { useTranslation } from "react-i18next";
import { useAuth } from './AuthProvider';
import { HiMenu } from "react-icons/hi";
import { FaRegBell, FaLinkedin } from "react-icons/fa";
import { useTheme } from 'next-themes';

const links = [
  { href: '/', label: 'navbar.home' },
  { href: '/models', label: 'navbar.models' },
  { href: '/dashboard', label: 'navbar.dashboard' },
  { href: '/datastore', label: 'navbar.datastore' },
  { href: '/about', label: 'navbar.about' },
  { href: '/publications', label: 'navbar.publications' },
  { href: '/docs', label: 'navbar.docs' },
  { href: '/IMDC', label: 'IMDC' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation("common");
  const { user, openLogin, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === path;
    return pathname.startsWith(path);
  };

  if (!mounted) return null;

  return (
    <nav
      className={clsx(
        "z-20 flex items-center justify-between px-6 py-4 border-b border-border text-text transition-colors bg-bg",
      )}
    >
      <div className="flex items-center gap-8">
        <div className="h-8 w-8 relative flex items-center justify-center">
          <Image src="/mosquito.svg" alt="Logo" width={32} height={32} priority />
        </div>

        <div className="hidden md:flex gap-6">
          {links.map((link) => {
            const active = isActive(link.href);
            const isExternal = ['/docs', '/IMDC'].includes(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={clsx(
                  'text-sm transition-all duration-200',
                  active
                    ? 'text-text font-bold'
                    : 'text-text/60 font-medium hover:text-text'
                )}
              >
                {t(link.label)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="relative group flex items-center justify-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-hover transition-colors text-text/80 hover:text-text"
              aria-label={t('footer.theme')}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
                  <path fillRule="evenodd" d="M12 2a.75.75 0 01.75.75V5a.75.75 0 01-1.5 0V2.75A.75.75 0 0112 2zm0 16a.75.75 0 01.75.75V22a.75.75 0 01-1.5 0v-3.25A.75.75 0 0112 18zm10-6a.75.75 0 01-.75.75H18a.75.75 0 010-1.5h3.25A.75.75 0 0122 12zm-16 0a.75.75 0 01-.75.75H2a.75.75 0 010-1.5h3.25A.75.75 0 016 12zm13.03-7.78a.75.75 0 010 1.06L17.06 7.25a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm-10.06 10.06a.75.75 0 010 1.06L7 17.97a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm10.06 1.06a.75.75 0 010 1.06l-1.97 1.97a.75.75 0 11-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zM7 6.03a.75.75 0 010 1.06L5.03 9.06A.75.75 0 013.97 8l1.97-1.97A.75.75 0 017 6.03z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M17.293 15.293A8 8 0 118.707 6.707a6.5 6.5 0 108.586 8.586z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <span className="absolute top-full mt-2 w-max px-2 py-1 bg-text text-bg text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
              {t('footer.theme')}
            </span>
          </div>

          <LanguageSelector />

          {user ? (
            <button
              className="p-2 rounded-full hover:bg-hover transition-colors text-text/80 hover:text-text"
              aria-label="Notifications"
            >
              <FaRegBell size={20} />
            </button>
          ) : (
            <button
              onClick={openLogin}
              className="text-sm font-medium hover:text-text/80 px-3 py-2 transition-colors"
            >
              {t("navbar.login")}
            </button>
          )}
        </div>

        <div className="h-6 w-px bg-border mx-2" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={clsx(
              "p-2 rounded-full transition-colors",
              dropdownOpen ? "bg-hover text-text" : "text-text/80 hover:bg-hover hover:text-text"
            )}
            aria-label="Menu"
          >
            <HiMenu size={20} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-bg border border-border rounded-lg shadow-xl z-50 overflow-hidden py-1">
              <ul className="flex flex-col text-sm">
                {user && (
                  <li>
                    <Link
                      href="/profile"
                      className={clsx(
                        "flex items-center px-4 py-2 transition-colors",
                        isActive('/profile')
                          ? "bg-hover text-text font-bold"
                          : "text-text/70 hover:bg-hover hover:text-text font-medium"
                      )}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/profile') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                        <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1" />
                      </svg>
                      {t("navbar.profile")}
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/models"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/models')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/models') ? "text-text" : "text-text/70")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7l8-4 8 4-8 4-8-4z" />
                      <path d="M4 7v10l8 4V11L4 7z" />
                      <path d="M12 11v10l8-4V7l-8 4z" />
                    </svg>
                    {t("navbar.models")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/dashboard')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/dashboard') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                    {t("navbar.dashboard")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/datastore"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/datastore')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/datastore') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3.904 1.777C4.978 1.289 6.427 1 8 1s3.022.289 4.096.777C13.125 2.245 14 2.993 14 4s-.875 1.755-1.904 2.223C11.022 6.711 9.573 7 8 7s-3.022-.289-4.096-.777C2.875 5.755 2 5.007 2 4s.875-1.755 1.904-2.223" />
                      <path d="M2 6.161V7c0 1.007.875 1.755 1.904 2.223C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777C13.125 8.755 14 8.007 14 7v-.839c-.457.432-1.004.751-1.49.972C11.278 7.693 9.682 8 8 8s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972" />
                      <path d="M2 9.161V10c0 1.007.875 1.755 1.904 2.223C4.978 12.711 6.427 13 8 13s3.022-.289 4.096-.777C13.125 11.755 14 11.007 14 10v-.839c-.457.432-1.004.751-1.49.972-1.232.56-2.828.867-4.51.867s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972" />
                      <path d="M2 12.161V13c0 1.007.875 1.755 1.904 2.223C4.978 15.711 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13v-.839c-.457.432-1.004.751-1.49.972-1.232.56-2.828.867-4.51.867s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972" />
                    </svg>
                    {t("navbar.datastore")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/docs')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/docs') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L7 13.101l-4.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v10.566l3.723-2.482a.5.5 0 0 1 .554 0L11 14.566V4a1 1 0 0 0-1-1z" />
                      <path d="M4.268 1H12a1 1 0 0 1 1 1v11.768l.223.148A.5.5 0 0 0 14 13.5V2a2 2 0 0 0-2-2H6a2 2 0 0 0-1.732 1" />
                    </svg>
                    {t("navbar.docs")}
                  </Link>
                </li>
                <li className="text-center text-xs font-semibold text-gray-500 py-2 uppercase tracking-wide">community</li>
                <li><hr className="border-t border-border" /></li>
                <li>
                  <Link
                    href="/publications"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/publications')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/publications') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1.4 1.7c.217.289.65.84 1.725 1.274 1.093.44 2.885.774 5.834.528 2.02-.168 3.431.51 4.326 1.556C14.161 6.082 14.5 7.41 14.5 8.5q0 .344-.027.734C13.387 8.252 11.877 7.76 10.39 7.5c-2.016-.288-4.188-.445-5.59-2.045-.142-.162-.402-.102-.379.112.108.985 1.104 1.82 1.844 2.308 2.37 1.566 5.772-.118 7.6 3.071.505.8 1.374 2.7 1.75 4.292.07.298-.066.611-.354.715a.7.7 0 0 1-.161.042 1 1 0 0 1-1.08-.794c-.13-.97-.396-1.913-.868-2.77C12.173 13.386 10.565 14 8 14c-1.854 0-3.32-.544-4.45-1.435-1.124-.887-1.889-2.095-2.39-3.383-1-2.562-1-5.536-.65-7.28L.73.806z" />
                    </svg>
                    {t("navbar.publications")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className={clsx(
                      "flex items-center px-4 py-2 transition-colors",
                      isActive('/about')
                        ? "bg-hover text-text font-bold"
                        : "text-text/70 hover:bg-hover hover:text-text font-medium"
                    )}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-4 h-4 mr-3", isActive('/about') ? "text-text" : "text-text/70")} fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
                    </svg>
                    {t("navbar.about")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://www.linkedin.com/company/mosqlimate/"
                    className="flex items-center px-4 py-2 text-text/70 hover:bg-hover hover:text-text font-medium transition-colors"
                    onClick={() => setDropdownOpen(false)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaLinkedin className="w-4 h-4 mr-3" />
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/Mosqlimate-project"
                    className="flex items-center px-4 py-2 text-text/70 hover:bg-hover hover:text-text font-medium transition-colors"
                    onClick={() => setDropdownOpen(false)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577v-2.234c-3.338.724-4.033-1.415-4.033-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.775.419-1.305.762-1.605-2.665-.305-5.467-1.333-5.467-5.933 0-1.31.469-2.381 1.235-3.221-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.46 11.46 0 013.003-.403c1.02.005 2.046.138 3.003.403 2.291-1.552 3.297-1.23 3.297-1.23.654 1.653.242 2.873.119 3.176.77.84 1.233 1.911 1.233 3.221 0 4.61-2.807 5.625-5.479 5.921.43.371.813 1.103.813 2.222v3.293c0 .319.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.63-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </Link>
                </li>
                {user && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <li>
                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span className="w-4 h-4 mr-3"></span>
                        {t("Logout")}
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
