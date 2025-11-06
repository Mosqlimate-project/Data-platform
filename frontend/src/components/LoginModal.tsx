'use client';

import { useAuth } from './AuthProvider';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { SiOrcid } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKEND_BASE_URL } from "@/lib/api";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { openRegister } = useAuth();

  if (!open) return null;

  const handleRegister = () => {
    onClose();
    openRegister();
  };

  const handleSocialLogin = (provider: 'google' | 'github' | 'orcid') => {
    window.location.href = `${BACKEND_BASE_URL}/accounts/${provider}/login/`;
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
              Login
            </h2>

            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <FcGoogle size={18} />
                <span>Google</span>
              </button>
              <button
                onClick={() => handleSocialLogin('github')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <FaGithub size={18} className="text-gray-800 dark:text-white" />
                <span>GitHub</span>
              </button>
              <button
                onClick={() => handleSocialLogin('orcid')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <SiOrcid size={18} className="text-[#A6CE39]" />
                <span>ORCID</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-neutral-900 px-3 text-gray-500 dark:text-gray-400">
                  or login with your account
                </span>
              </div>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              <input
                type="text"
                placeholder="Username or Email"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md py-2 mt-3 transition-all shadow-sm hover:shadow-md"
              >
                Sign in
              </button>
            </form>

            <div className="flex flex-col items-center mt-5 text-sm text-gray-600 dark:text-gray-400">
              <button
                onClick={handleRegister}
                className="underline hover:text-blue-600 dark:hover:text-blue-400 transition mb-2"
              >
                Don’t have an account? Register
              </button>
              <button
                onClick={onClose}
                className="underline hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
