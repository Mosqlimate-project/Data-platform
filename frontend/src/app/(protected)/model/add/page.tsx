'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGithub, FaGitlab, FaLink, FaArrowRight, FaEnvelope,
  FaSpinner, FaArrowLeft, FaSearch, FaCodeBranch, FaExclamationCircle,
  FaClock, FaMapMarkerAlt, FaFlask, FaCheckSquare
} from 'react-icons/fa';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';

interface Repository {
  id: string;
  name: string;
  url: string;
  private: boolean;
  provider: 'github' | 'gitlab';
}

interface Disease {
  id: number;
  name: string;
}

export default function AddModelPage() {
  const router = useRouter();

  const [step, setStep] = useState<'selection' | 'config' | 'verify'>('selection');

  const [repos, setRepos] = useState<Repository[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  const [url, setUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');

  const [config, setConfig] = useState({
    disease: '',
    timeResolution: 'daily',
    adminLevel: '0',
    sprint: false,
    varType: 'quantitative',
    spatial: false,
    temporal: false,
  });

  const [otp, setOtp] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Repositories & Diseases on Mount
  useEffect(() => {
    const initData = async () => {
      setLoadingRepos(true);

      // Fetch Repos
      const results: Repository[] = [];
      const fetchProvider = async (provider: 'github' | 'gitlab') => {
        try {
          const data = await apiFetch(`/user/repositories/${provider}/`, { auth: true });
          if (Array.isArray(data)) {
            results.push(...data.map((r: any) => ({ ...r, provider })));
          }
        } catch (err) { /* ignore */ }
      };

      // Fetch Diseases (Mocking the endpoint structure based on standard django-ninja patterns)
      const fetchDiseases = async () => {
        try {
          // Replace with your actual endpoint
          const data = await apiFetch('/registry/diseases/');
          setDiseases(data);
        } catch (err) {
          // Fallback for dev/demo if endpoint fails
          setDiseases([{ id: 1, name: "Dengue" }, { id: 2, name: "Malaria" }, { id: 3, name: "Zika" }]);
        }
      };

      await Promise.all([
        fetchProvider('github'),
        fetchProvider('gitlab'),
        fetchDiseases()
      ]);

      setRepos(results);
      setLoadingRepos(false);
    };

    initData();
  }, []);

  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || repo.provider === activeTab;
    return matchesSearch && matchesTab;
  });

  // Transition from Selection -> Config
  const handleRepoSelect = (repoUrl: string) => {
    setError(null);
    setUrl(repoUrl);
    setStep('config');
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Validate if it matches a known repo (optional, based on your previous logic)
    const normalize = (u: string) => u.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');
    const cleanInput = normalize(url);
    const exists = repos.some(r => normalize(r.url) === cleanInput);

    if (!exists) {
      setError("Please select a valid repository from the list or ensure your account is connected.");
      return;
    }

    setStep('config');
  };

  // Transition from Config -> Verify (Calls Backend)
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      repo_url: url,
      disease_id: config.disease, // Assuming backend expects ID
      time_resolution: config.timeResolution,
      admin_level: parseInt(config.adminLevel),
      is_sprint: config.sprint,
      variable_type: config.varType,
      is_spatial: config.spatial,
      is_temporal: config.temporal
    };

    try {
      const res = await fetch('/api/registry/model/init', {
        method: 'POST',
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  // Helper for Toggle Inputs
  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)]">
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 mb-20">
      <div className="bg-[var(--color-bg)] rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden relative">

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-neutral-800">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{
              width: step === 'selection' ? "33%" : step === 'config' ? "66%" : "100%"
            }}
          />
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">

            {/* STEP 1: SELECTION */}
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
                <form onSubmit={handleManualUrlSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLink className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://github.com/username/repository"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    className="block w-full pl-10 pr-24 py-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!url || loading}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-0 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </form>

                <div className="flex items-center gap-4">
                  <div className="h-px bg-[var(--color-border)] flex-1" />
                  <span className="text-xs text-[var(--color-text)] opacity-40 uppercase font-semibold">
                    OR SELECT REPOSITORY
                  </span>
                  <div className="h-px bg-[var(--color-border)] flex-1" />
                </div>

                {/* Filters */}
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

                {/* Repo List */}
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
                          onClick={() => handleRepoSelect(repo.url)}
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
                          <FaArrowRight className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--color-text)] opacity-50 p-6 text-center">
                      <FaCodeBranch className="text-2xl mb-2" />
                      <p>No repositories found.</p>
                      <p className="text-xs mt-1">Make sure your account is connected in Settings.</p>
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

            {/* STEP 2: CONFIGURATION */}
            {step === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Configuration</h1>
                  <p className="text-[var(--color-text)] opacity-60">
                    Provide details about the model in this repository.
                  </p>
                </div>

                <form onSubmit={handleConfigSubmit} className="space-y-5">

                  {/* Read Only Repo URL */}
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3 border border-[var(--color-border)]">
                    <FaCodeBranch className="text-gray-500" />
                    <span className="text-sm font-mono text-[var(--color-text)] truncate flex-1">{url}</span>
                    <FaCheckSquare className="text-green-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Disease */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">Disease</label>
                      <div className="relative">
                        <FaFlask className="absolute left-3 top-3 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          value={config.disease}
                          onChange={(e) => setConfig({ ...config, disease: e.target.value })}
                          required
                        >
                          <option value="" disabled>Select Disease</option>
                          {diseases.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Time Resolution */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">Time Resolution</label>
                      <div className="relative">
                        <FaClock className="absolute left-3 top-3 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          value={config.timeResolution}
                          onChange={(e) => setConfig({ ...config, timeResolution: e.target.value })}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    {/* Admin Level */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">Admin Level</label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          value={config.adminLevel}
                          onChange={(e) => setConfig({ ...config, adminLevel: e.target.value })}
                        >
                          <option value="0">0 (Country)</option>
                          <option value="1">1 (Region/State)</option>
                          <option value="2">2 (City/Muni)</option>
                          <option value="3">3 (Local)</option>
                        </select>
                      </div>
                    </div>

                    {/* Categorical vs Quantitative */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">Variable Type</label>
                      <div className="flex bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, varType: 'quantitative' })}
                          className={clsx("flex-1 py-1.5 text-sm rounded-md transition-all", config.varType === 'quantitative' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-medium" : "text-gray-500")}
                        >
                          Quantitative
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, varType: 'categorical' })}
                          className={clsx("flex-1 py-1.5 text-sm rounded-md transition-all", config.varType === 'categorical' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-medium" : "text-gray-500")}
                        >
                          Categorical
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <Toggle label="Sprint" checked={config.sprint} onChange={(v) => setConfig({ ...config, sprint: v })} />
                    <Toggle label="Spatial" checked={config.spatial} onChange={(v) => setConfig({ ...config, spatial: v })} />
                    <Toggle label="Temporal" checked={config.temporal} onChange={(v) => setConfig({ ...config, temporal: v })} />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('selection')}
                      className="flex-1 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !config.disease}
                      className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : "Initiate Verification"}
                    </button>
                  </div>

                  {error && (
                    <p className="text-sm text-center text-red-500 mt-2">{error}</p>
                  )}
                </form>
              </motion.div>
            )}

            {/* STEP 3: VERIFY */}
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
                      onClick={() => setStep('config')}
                      className="text-sm text-[var(--color-text)] opacity-60 hover:opacity-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaArrowLeft size={12} /> Back to configuration
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
