'use client';

import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { SiOrcid } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';
import { oauthLogin } from "@/lib/api/auth";

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function RegisterModal({ open, onClose }: RegisterModalProps) {
  if (!open) return null;

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
                onClick={() => oauthLogin('google')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <FcGoogle size={18} />
                <span>Google</span>
              </button>
              <button
                onClick={() => oauthLogin('github')}
                className="flex items-center gap-2 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <FaGithub size={18} className="text-gray-800 dark:text-white" />
                <span>GitHub</span>
              </button>
              <button
                onClick={() => oauthLogin('orcid')}
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
                  or register with email
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
                name="name"
                placeholder="Full name"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                name="username"
                placeholder="Username"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md py-2 mt-3 transition-all shadow-sm hover:shadow-md"
              >
                Create Account
              </button>

              <button
                onClick={onClose}
                type="button"
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
