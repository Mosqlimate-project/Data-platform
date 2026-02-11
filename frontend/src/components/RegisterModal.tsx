'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaGitlab } from "react-icons/fa";
import { oauthLogin } from '@/lib/api/auth';
import { useTranslation } from 'react-i18next';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function RegisterModal({ open, onClose }: RegisterModalProps) {
  const { t } = useTranslation('common');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const pathname = usePathname();

  if (!open) return null;

  const validateUsername = (value: string) => {
    if (value.length < 4) return t('register_modal.errors.username_short');
    if (value.length > 25) return t('register_modal.errors.username_long');
    if (!/^[a-zA-Z0-9._]+$/.test(value)) return t('register_modal.errors.username_invalid');
    return '';
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setEmail(value);
    setEmailError(e.target.validity.valid ? "" : t('register_modal.errors.email_invalid'));
  };

  const checkUsernameAvailable = async (username: string) => {
    const resp = await fetch(`/api/user/check-username/?username=${username}`);
    return resp.ok ? null : t('register_modal.errors.username_taken');
  };

  const checkEmailAvailable = async (email: string) => {
    const resp = await fetch(`/api/user/check-email/?email=${email}`);
    return resp.ok ? null : t('register_modal.errors.email_taken');
  };

  const handleOAuth = (provider: "google" | "github" | "gitlab") => {
    oauthLogin(provider, pathname);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const usernameValue = form.username.value.trim();
    const emailValue = form.email.value.trim();

    setUsernameError('');
    setEmailError('');

    const localValidation = validateUsername(usernameValue);
    if (localValidation) {
      setUsernameError(localValidation);
      return;
    }

    const usernameErr = await checkUsernameAvailable(usernameValue);
    const emailErr = await checkEmailAvailable(emailValue);

    if (usernameErr) setUsernameError(usernameErr);
    if (emailErr) setEmailError(emailErr);

    if (!usernameErr && !emailErr) {
      const params = new URLSearchParams({ username: usernameValue, email: emailValue });
      window.location.href = `/register?${params.toString()}`;
    }
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
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-[var(--color-text)] opacity-50 hover:opacity-100 transition"
            >
              ✕
            </button>

            <h2 className="text-2xl font-semibold text-center mb-6 text-[var(--color-text)]">
              {t('register_modal.title')}
            </h2>

            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={() => handleOAuth('google')}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-hover)] text-[var(--color-text)] transition"
              >
                <React.Suspense fallback={null}>
                  <FcGoogle size={18} />
                </React.Suspense>
                <span>Google</span>
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-hover)] text-[var(--color-text)] transition"
              >
                <React.Suspense fallback={null}>
                  <FaGithub size={18} className="text-[var(--color-text)]" />
                </React.Suspense>
                <span>GitHub</span>
              </button>
              <button
                onClick={() => handleOAuth('gitlab')}
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
                  {t('register_modal.or_register_with')}
                </span>
              </div>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div>
                <input
                  name="username"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder={t('register_modal.placeholder_username')}
                  className="border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  required
                />
                {usernameError && (
                  <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t('register_modal.placeholder_email')}
                  className="border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!username || !!usernameError || !!emailError}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-md py-2 mt-3 transition-all shadow-sm hover:shadow-md"
              >
                {t('register_modal.btn_continue')}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-sm text-[var(--color-text)] opacity-60 hover:opacity-100 underline mt-3"
              >
                {t('register_modal.btn_cancel')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
