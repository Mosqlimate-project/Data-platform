'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaGitlab, FaLink, FaArrowRight, FaCheckCircle, FaExclamationCircle, FaEnvelope, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import clsx from 'clsx';

export default function AddModelPage() {
  const [step, setStep] = useState<'input' | 'verify'>('input');

  const [url, setUrl] = useState('');
  const [otp, setOtp] = useState('');

  const [provider, setProvider] = useState<'github' | 'gitlab' | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);

  const router = useRouter();

  const validateUrl = (value: string) => {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+(\/)?$/;
    const gitlabRegex = /^https?:\/\/(www\.)?gitlab\.com\/[\w-]+\/[\w.-]+(\/)?$/;

    if (githubRegex.test(value)) {
      setProvider('github');
      setIsValid(true);
    } else if (gitlabRegex.test(value)) {
      setProvider('gitlab');
      setIsValid(true);
    } else {
      setProvider(null);
      setIsValid(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setTouched(true);
    setError(null);
    validateUrl(value);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registry/model/init', {
        method: 'POST',
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url })
      });

      if (!res.ok) {
        throw new Error('Could not find repository owner or public email.');
      }

      const data = await res.json();

      setEmailHint(data.email_hint || 'the repository owner email');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registry/import/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url, code: otp })
      });

      if (!res.ok) {
        throw new Error('Invalid code. Please try again.');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-200 dark:border-neutral-800 overflow-hidden relative">

        <div className="h-1 w-full bg-gray-100 dark:bg-neutral-800">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: step === 'input' ? "50%" : "100%" }}
          />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">

            {step === 'input' && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Import Model
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Enter the repository URL. We will send a verification code to the owner to confirm access.
                  </p>
                </div>

                <form onSubmit={handleUrlSubmit} className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Repository URL
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {provider === 'github' && <FaGithub className="text-gray-900 dark:text-white text-lg" />}
                        {provider === 'gitlab' && <FaGitlab className="text-orange-500 text-lg" />}
                        {!provider && <FaLink className="text-gray-400 text-lg" />}
                      </div>

                      <input
                        id="repo-url"
                        type="url"
                        placeholder="https://github.com/username/repository"
                        value={url}
                        onChange={handleUrlChange}
                        disabled={loading}
                        className={clsx(
                          "block w-full pl-10 pr-10 py-3 border rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:outline-none transition-all disabled:opacity-50",
                          isValid
                            ? "border-green-500 focus:ring-green-500/20"
                            : touched && url.length > 0
                              ? "border-red-500 focus:ring-red-500/20"
                              : "border-gray-300 dark:border-neutral-700 focus:border-blue-500 focus:ring-blue-500/20"
                        )}
                        autoComplete="off"
                        autoFocus
                      />

                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {isValid && <FaCheckCircle className="text-green-500 text-lg" />}
                        {!isValid && touched && url.length > 0 && <FaExclamationCircle className="text-red-500 text-lg" />}
                      </div>
                    </div>

                    {!isValid && touched && url.length > 0 && (
                      <p className="text-sm text-red-500 mt-1">
                        Please enter a valid GitHub or GitLab repository URL.
                      </p>
                    )}

                    {error && (
                      <p className="text-sm text-red-500 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!isValid || loading}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                        isValid && !loading
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                          : "bg-gray-200 dark:bg-neutral-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          Continue <FaArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <FaEnvelope className="text-blue-600 dark:text-blue-400 text-xl" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Check your email
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    We sent a 6-digit verification code to <strong>{emailHint}</strong>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <label htmlFor="otp" className="sr-only">Verification Code</label>
                    <input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="block w-full text-center tracking-[0.5em] text-2xl py-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20 outline-none transition-all"
                      autoComplete="one-time-code"
                      autoFocus
                    />

                    {error && (
                      <p className="text-sm text-center text-red-500 mt-2">
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={otp.length !== 6 || loading}
                      className={clsx(
                        "w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
                        otp.length === 6 && !loading
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                          : "bg-gray-200 dark:bg-neutral-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : "Verify & Import"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <FaArrowLeft size={12} /> Back to URL
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
