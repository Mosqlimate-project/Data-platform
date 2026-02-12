'use client';

import React from "react";
import { useAuth } from './AuthProvider';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaGitlab } from "react-icons/fa";
import { oauthLogin } from "@/lib/api/auth";
import { useTranslation } from 'react-i18next';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
}

export default function LoginModal({ open, onClose, onCancel }: LoginModalProps) {
  const { t } = useTranslation('common');
  const { openRegister, fetchUser } = useAuth();
  const pathname = usePathname();

  if (!open) return null;

  const protectedRoutes = ['/model/add', '/profile'];

  const handleRegister = () => {
    onClose();
    openRegister();
  };

  const handleCancel = () => {
    Cookies.remove("requires_auth", { path: "/" });
    onClose();
    const isProtected = protectedRoutes.some(route =>
      pathname?.startsWith(route)
    );
    if (isProtected) {
      window.location.href = "/";
    }
  };

  const handleOAuth = (provider: "google" | "github" | "gitlab") => {
    oauthLogin(provider, pathname);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[var(--color-bg)] rounded-2xl shadow-xl p-8 w-[90%] max-w-md relative border border-[var(--color-border)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-6 text-[var(--color-text)]">
              {t('login_modal.title')}
            </h2>

            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={() => handleOAuth("google")}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-hover)] text-[var(--color-text)] transition"
              >
                <React.Suspense fallback={null}>
                  <FcGoogle size={18} />
                </React.Suspense>
                <span>Google</span>
              </button>

              <button
                onClick={() => handleOAuth("github")}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-hover)] text-[var(--color-text)] transition"
              >
                <React.Suspense fallback={null}>
                  <FaGithub size={18} className="text-[var(--color-text)]" />
                </React.Suspense>
                <span>GitHub</span>
              </button>

              <button
                onClick={() => handleOAuth("gitlab")}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-hover)] text-[var(--color-text)] transition"
              >
                <React.Suspense fallback={null}>
                  <FaGitlab size={18} className="text-orange-600" />
                </React.Suspense>
                <span>GitLab</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--color-bg)] px-3 text-[var(--color-text)] opacity-60">
                  {t('login_modal.or_login_with')}
                </span>
              </div>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault();

                const form = e.currentTarget;
                const dataForm = new FormData(form);

                const username = dataForm.get("username") as string;
                const password = dataForm.get("password") as string;

                const resp = await fetch(`/api/auth/set-session`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ identifier: username, password }),
                });

                if (!resp.ok) {
                  alert(t('login_modal.alert_invalid'));
                  return;
                }

                await fetchUser();
                onClose();
                window.location.reload();
              }}
            >
              <input
                name="username"
                type="text"
                placeholder={t('login_modal.placeholder_username')}
                className="border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <input
                name="password"
                type="password"
                placeholder={t('login_modal.placeholder_password')}
                className="border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md py-2 mt-3 transition-all shadow-sm hover:shadow-md"
              >
                {t('login_modal.btn_signin')}
              </button>
            </form>

            <div className="flex flex-col items-center mt-5 text-sm text-[var(--color-text)] opacity-80">
              <button
                onClick={handleRegister}
                className="underline hover:text-blue-500 transition mb-2"
              >
                {t('login_modal.register_prompt')}
              </button>

              <button
                onClick={handleCancel}
                className="underline hover:text-blue-500 transition"
              >
                {t('login_modal.btn_cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
