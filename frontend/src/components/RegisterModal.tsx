'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaGitlab } from "react-icons/fa";
import { oauthLogin } from '@/lib/api/auth';
import { NEXT_PUBLIC_API_URL } from '@/lib/env';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function RegisterModal({ open, onClose }: RegisterModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const pathname = usePathname();

  if (!open) return null;

  const validateUsername = (value: string) => {
    if (value.length < 4) return 'Username too short';
    if (value.length > 25) return 'Username too long';
    if (!/^[a-zA-Z0-9._]+$/.test(value)) return 'Invalid username';
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
    setEmailError(e.target.validity.valid ? "" : "Invalid email");
  };

  const checkUsernameAvailable = async (username: string) => {
    const resp = await fetch(`${NEXT_PUBLIC_API_URL}/user/check-username/?username=${username}`);
    return resp.ok ? null : 'Username is already taken';
  };

  const checkEmailAvailable = async (email: string) => {
    const resp = await fetch(`${NEXT_PUBLIC_API_URL}/user/check-email/?email=${email}`);
    return resp.ok ? null : 'Email is already registered';
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
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 w-[90%] max-w-md relative border border-gray-200 dark:border-neutral-700"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              ✕
            </button>

            <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-100">
              Create your account
            </h2>

            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={() => handleOAuth('google')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <React.Suspense fallback={null}>
                  <FcGoogle size={18} />
                </React.Suspense>
                <span>Google</span>
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <React.Suspense fallback={null}>
                  <FaGithub size={18} className="text-gray-800 dark:text-white" />
                </React.Suspense>
                <span>GitHub</span>
              </button>
              <button
                onClick={() => handleOAuth('gitlab')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <React.Suspense fallback={null}>
                  <FaGitlab size={18} className="text-orange-600" />
                </React.Suspense>
                <span>GitLab</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-neutral-900 px-3 text-gray-500 dark:text-gray-400">
                  or register with email
                </span>
              </div>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div>
                <input
                  name="username"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Username"
                  className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none w-full"
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
                  placeholder="Email"
                  className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none w-full"
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
                Continue
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-500 dark:text-gray-400 underline mt-3"
              >
                Cancel
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
