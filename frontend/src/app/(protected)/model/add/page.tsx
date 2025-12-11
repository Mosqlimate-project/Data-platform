'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaGitlab, FaLink, FaArrowRight, FaEnvelope, FaSpinner, FaArrowLeft, FaSearch, FaCodeBranch, FaExclamationCircle } from 'react-icons/fa';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';

interface Repository {
  id: string;
  name: string;
  url: string;
  private: boolean;
  provider: 'github' | 'gitlab';
}

export default function AddModelPage() {
  const router = useRouter();
  const [step, setStep] = useState<'selection' | 'verify'>('selection');

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  const [url, setUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');

  const [otp, setOtp] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      setLoadingRepos(true);
      const results: Repository[] = [];

      const fetchProvider = async (provider: 'github' | 'gitlab') => {
        try {
          const data = await apiFetch(`/user/repositories/${provider}/`, { auth: true });
          if (Array.isArray(data)) {
            results.push(...data.map((r: any) => ({ ...r, provider })));
          }
        } catch (err) {
        }
      };

      await Promise.all([fetchProvider('github'), fetchProvider('gitlab')]);

      setRepos(results);
      setLoadingRepos(false);
    };

    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || repo.provider === activeTab;
    return matchesSearch && matchesTab;
  });

  const initiateImport = async (repoUrl: string) => {
    setLoading(true);
    setError(null);
    setUrl(repoUrl);

    try {
      const res = await fetch('/api/registry/model/init', {
        method: 'POST',
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not validate repository.');
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const isValidRepo = repos.some(r =>
      r.url.toLowerCase() === url.toLowerCase() ||
      r.url.toLowerCase().replace('.git', '') === url.toLowerCase().replace('.git', '')
    );

    if (!isValidRepo) {
      setError("Please select a valid repository from the list below.");
      return;
    }

    initiateImport(url);
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
        throw new Error('Invalid verification code.');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 mb-20">
      <div className="bg-[var(--color-bg)] rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden relative">

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-neutral-800">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: step === 'selection' ? "30%" : "100%" }}
          />
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">

            {step === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Import Model</h1>
                  <p className="text-[var(--color-text)] opacity-60">
                    Select a repository to import or paste a URL directly.
                  </p>
                </div>

                {/* Manual Input */}
                <form onSubmit={handleManualSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLink className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://github.com/username/repository"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    className="block w-full pl-10 pr-24 py-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!url || loading}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-0 disabled:pointer-events-none"
                  >
                    Import
                  </button>
                </form>

                <div className="flex items-center gap-4">
                  <div className="h-px bg-[var(--color-border)] flex-1" />
                  <span className="text-xs text-[var(--color-text)] opacity-40 uppercase font-semibold">
                    OR SELECT REPOSITORY
                  </span>
                  <div className="h-px bg-[var(--color-border)] flex-1" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="flex bg-[var(--color-hover)] p-1 rounded-lg">
                    {['all', 'github', 'gitlab'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={clsx(
                          "px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                          activeTab === tab
                            ? "bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm"
                            : "text-[var(--color-text)] opacity-60 hover:opacity-100"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg bg-gray-50 dark:bg-black/20">
                  {loadingRepos ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--color-text)] opacity-50 gap-2">
                      <FaSpinner className="animate-spin text-xl" />
                      <span className="text-sm">Loading repositories...</span>
                    </div>
                  ) : filteredRepos.length > 0 ? (
                    <div className="divide-y divide-[var(--color-border)]">
                      {filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => initiateImport(repo.url)}
                          disabled={loading}
                          className="w-full text-left p-4 hover:bg-[var(--color-hover)] transition-colors flex items-center justify-between group disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-lg", repo.provider === 'github' ? "bg-gray-100 dark:bg-gray-800 text-black dark:text-white" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600")}>
                              {repo.provider === 'github' ? <FaGithub /> : <FaGitlab />}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-[var(--color-text)] truncate">{repo.name}</h3>
                              <p className="text-xs text-[var(--color-text)] opacity-50 truncate">{repo.url}</p>
                            </div>
                          </div>
                          {loading && url === repo.url ? (
                            <FaSpinner className="animate-spin text-blue-500" />
                          ) : (
                            <FaArrowRight className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--color-text)] opacity-50 p-6 text-center">
                      <FaCodeBranch className="text-2xl mb-2" />
                      <p>No repositories found.</p>
                      <p className="text-xs mt-1">Make sure your account is connected in Profile/Auth settings.</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <FaExclamationCircle className="shrink-0" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <FaEnvelope className="text-blue-600 dark:text-blue-400 text-xl" />
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                    Check your email
                  </h1>
                  <p className="text-[var(--color-text)] opacity-60 max-w-sm mx-auto">
                    We sent a verification code to <strong>{emailHint}</strong>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="block w-full text-center tracking-[0.5em] text-2xl py-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:border-blue-500 outline-none transition-all"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                    {error && (
                      <p className="text-sm text-center text-red-500">
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
                      onClick={() => setStep('selection')}
                      className="text-sm text-[var(--color-text)] opacity-60 hover:opacity-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaArrowLeft size={12} /> Back to selection
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
