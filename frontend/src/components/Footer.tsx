'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  const [showCitation, setShowCitation] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <footer
      className="z-20 border-t border-border w-full text-[var(--color-text)] transition-colors bg-bg"
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs">
                <Image src="/mosquito.svg" alt="Logo" width={32} height={32} priority />
              </div>
              <span className="text-xl font-bold tracking-tight">Mosqlimate</span>
            </Link>

            <div className="mt-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors text-xs font-medium w-fit"
              >
                {theme === 'light' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
                      <path fillRule="evenodd" d="M12 2a.75.75 0 01.75.75V5a.75.75 0 01-1.5 0V2.75A.75.75 0 0112 2zm0 16a.75.75 0 01.75.75V22a.75.75 0 01-1.5 0v-3.25A.75.75 0 0112 18zm10-6a.75.75 0 01-.75.75H18a.75.75 0 010-1.5h3.25A.75.75 0 0122 12zm-16 0a.75.75 0 01-.75.75H2a.75.75 0 010-1.5h3.25A.75.75 0 016 12zm13.03-7.78a.75.75 0 010 1.06L17.06 7.25a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm-10.06 10.06a.75.75 0 010 1.06L7 17.97a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm10.06 1.06a.75.75 0 010 1.06l-1.97 1.97a.75.75 0 11-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zM7 6.03a.75.75 0 010 1.06L5.03 9.06A.75.75 0 013.97 8l1.97-1.97A.75.75 0 017 6.03z" clipRule="evenodd" />
                    </svg>
                    <span>{t('footer.theme')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M17.293 15.293A8 8 0 118.707 6.707a6.5 6.5 0 108.586 8.586z" clipRule="evenodd" />
                    </svg>
                    <span>{t('footer.theme')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm">{t('footer.cite_title')}</h3>
            <div className="text-xs opacity-80">
              <button
                onClick={() => setShowCitation(!showCitation)}
                className="flex items-center gap-1 font-medium hover:text-[var(--color-primary)] transition-colors focus:outline-none"
              >
                <span>{showCitation ? t('footer.cite_hide') : t('footer.cite_show')}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${showCitation ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${showCitation ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <p className="leading-relaxed mb-2 italic bg-muted/10 p-2 rounded border border-border">
                    {t('footer.cite_text')}
                  </p>
                  <a
                    href="https://arxiv.org/abs/2410.18945"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {t('footer.cite_link')}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm">{t('footer.funding_title')}</h3>
            <ul className="flex flex-col gap-2 text-sm opacity-80">
              <li>
                <a
                  href="https://wellcome.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-medium"
                >
                  {t('footer.funding_agency')}
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm">{t('footer.connect_title')}</h3>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <a
                  href="mailto:mosqlimate@gmail.com"
                  className="flex items-center gap-2 hover:text-blue-500 transition-colors opacity-80 hover:opacity-100"
                >
                  {t('footer.connect_email')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@Mosqlimate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-red-500 transition-colors opacity-80 hover:opacity-100"
                >
                  {t('footer.connect_youtube')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-8 flex flex-col md:flex-row justify-between items-center text-xs opacity-60">
          <div>
            &copy; <a href="https://mosqlimate.org/" className="hover:underline">{t('footer.project_name')}</a>, {currentYear}. {t('footer.rights')}
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="/terms" className="hover:underline">{t('footer.terms')}</a>
            <a href="/privacy" className="hover:underline">{t('footer.privacy')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
