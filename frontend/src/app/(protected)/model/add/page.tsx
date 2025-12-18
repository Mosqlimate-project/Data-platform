'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGithub, FaGitlab, FaLink, FaArrowRight, FaEnvelope,
  FaSpinner, FaArrowLeft, FaSearch, FaCodeBranch, FaExclamationCircle,
  FaClock, FaCheck, FaChevronDown, FaTimes, FaGlobeAmericas, FaVirus
} from 'react-icons/fa';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';
import { useTheme } from 'next-themes';
import { oauthLogin } from '@/lib/api/auth';

interface Repository {
  id: string;
  name: string;
  url: string;
  private: boolean;
  provider: 'github' | 'gitlab';
  available: boolean;
}

interface Disease {
  id: number;
  code: string;
  name: string;
}

export default function AddModelPage() {
  const router = useRouter();
  const pathname = usePathname();

  const initialized = useRef(false);
  const theme = useTheme();
  const isDark = theme.resolvedTheme === "dark";

  const [step, setStep] = useState<'selection' | 'config' | 'verify'>('selection');

  const [repos, setRepos] = useState<Repository[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [searchingDiseases, setSearchingDiseases] = useState(false);

  const [url, setUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');
  const [githubAppStatus, setGithubAppStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [isDiseaseOpen, setIsDiseaseOpen] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState("");
  const [otp, setOtp] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const installUrl = `/api/user/oauth/install/github?next=${encodeURIComponent(pathname)}`;

  const performDiseaseSearch = async () => {
    if (config.disease) return;

    if (!diseaseSearch.trim()) {
      setIsDiseaseOpen(false);
      return;
    }

    setSearchingDiseases(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        icd: "ICD-10",
        version: "2010",
        name: diseaseSearch
      });

      const res = await fetch(`/api/datastore/diseases?${params}`);

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      if (Array.isArray(data)) {
        setDiseases(data);
        setIsDiseaseOpen(true);
      }
    } catch (err) {
      console.error(err);
      setDiseases([]);
      setIsDiseaseOpen(false);
    } finally {
      setSearchingDiseases(false);
    }
  };

  const handleDiseaseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performDiseaseSearch();
    }
  };

  const handleSelectDisease = (d: Disease) => {
    setConfig({ ...config, disease: String(d.id) });
    setDiseaseSearch(d.name);
    setIsDiseaseOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDiseaseSearch("");
    setConfig({ ...config, disease: "" });
    setDiseases([]);
    setIsDiseaseOpen(false);
  };

  const [config, setConfig] = useState({
    disease: "",
    timeResolution: "",
    adminLevel: "",
    varType: "quantitative",
    sprint: false,
    spatial: false,
    temporal: false
  })

  function getModelName(url: string) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.substring(1);
    } catch (error) {
      return "";
    }
  }

  const fetchConnectedProviders = async () => {
    try {
      const connectedProviders = await apiFetch("/user/oauth/connections/", { auth: true });
      setConnectedProviders(connectedProviders);
    } catch (err) {
      console.error("Failed to fetch connections");
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetchConnectedProviders();

    const initData = async () => {
      setLoadingRepos(true);
      setGithubAppStatus('loading');

      const results: Repository[] = [];

      const fetchProvider = async (provider: 'github' | 'gitlab') => {
        try {
          const data = await apiFetch(`/user/repositories/${provider}/`, { auth: true });
          if (Array.isArray(data)) {
            if (provider === 'github') {
              if (data.length > 0) {
                setGithubAppStatus('connected');
              } else {
                setGithubAppStatus('missing');
              }
            }
            results.push(...data.map((r: any) => ({ ...r, provider })));
          }
        } catch (err) {
          if (provider === 'github') setGithubAppStatus('missing');
        }
      };

      await Promise.all([
        fetchProvider('github'),
        fetchProvider('gitlab'),
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

  const handleRepoSelect = (repoUrl: string) => {
    setError(null);
    setUrl(repoUrl);
    setStep('config');
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const normalize = (u: string) => u.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');
    const cleanInput = normalize(url);

    const matchedRepo = repos.find(r => normalize(r.url) === cleanInput);

    if (matchedRepo && matchedRepo.available === false) {
      setError("This repository has already been imported.");
      return;
    }

    const exists = repos.some(r => normalize(r.url) === cleanInput);

    if (!exists) {
      setError("Please select a valid repository from the list or ensure your account is connected.");
      return;
    }

    setStep('config');
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      repo_url: url,
      disease_id: config.disease,
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
    <div className="max-w-2xl mx-auto mt-10 px-4 mb-20 bg-">
      <div className={clsx(
        "rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden relative", isDark ? "bg-accent" : "bg-bg"
      )}>

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
                      {filteredRepos.map((repo) => {
                        const isAvailable = repo.available !== false;

                        return (
                          <button
                            key={repo.id}
                            onClick={() => isAvailable && handleRepoSelect(repo.url)}
                            disabled={loading || !isAvailable}
                            className={clsx(
                              "w-full text-left p-4 transition-colors flex items-center justify-between group",
                              isAvailable
                                ? "hover:bg-[var(--color-hover)]"
                                : "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5"
                            )}
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

                            {isAvailable ? (
                              <FaArrowRight className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                            ) : (
                              <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded flex items-center gap-1">
                                <FaCheck size={10} /> Imported
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--color-text)] p-6 text-center">

                      {activeTab === 'github' && !connectedProviders.includes('github') ? (
                        <>
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                            <FaGithub className="text-2xl" />
                          </div>
                          <h3 className="text-base font-medium mb-1">Link GitHub Account</h3>
                          <p className="text-xs opacity-60 max-w-[200px] mb-4">
                            You need to link your GitHub account to access repositories.
                          </p>
                          <button
                            onClick={() => oauthLogin("github", pathname)}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                          >
                            <FaLink /> Connect GitHub
                          </button>
                        </>
                      )
                        : activeTab === 'github' && githubAppStatus !== 'connected' ? (
                          <>
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                              <FaGithub className="text-2xl" />
                            </div>
                            <h3 className="text-base font-medium mb-1">Install GitHub App</h3>
                            <p className="text-xs opacity-60 max-w-[250px] mb-4">
                              Your account is connected, but you need to install the Model Registry App to import repositories.
                            </p>
                            <a
                              href={installUrl}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                            >
                              <FaGithub /> Install App
                            </a>
                          </>
                        )
                          : (
                            <>
                              <FaCodeBranch className="icon-sm mb-2 opacity-50" />
                              <p className="opacity-50">No repositories found.</p>
                              <p className="text-xs mt-1 opacity-40">Make sure your account is connected in Settings.</p>
                            </>
                          )}

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
                  <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{getModelName(url)}</h1>
                  <p className="text-[var(--color-text)] opacity-60">
                    Provide details about the model in this repository.
                  </p>
                </div>
                <form onSubmit={handleConfigSubmit} className="space-y-5">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3 border border-[var(--color-border)]">
                    <FaCodeBranch className="icon-sm text-gray-500" />
                    <span className="text-sm font-mono text-[var(--color-text)] truncate flex-1">
                      {url}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-1 relative group">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Disease
                      </label>

                      {isDiseaseOpen && (
                        <div
                          className="fixed inset-0 z-10"
                        />
                      )}
                      <div className="relative z-20">
                        <FaVirus className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Enter to search"
                          value={diseaseSearch}
                          onKeyDown={handleDiseaseKeyDown}
                          onBlur={performDiseaseSearch}
                          onChange={(e) => {
                            setDiseaseSearch(e.target.value);
                            if (config.disease) setConfig({ ...config, disease: "" });
                          }}
                        />

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {searchingDiseases ? (
                            <FaSpinner className="animate-spin text-blue-500" />
                          ) : diseaseSearch && (
                            <button
                              type="button"
                              onClick={clearSelection}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          )}
                          <FaChevronDown className={`text-gray-400 text-xs transition-transform pointer-events-none ${isDiseaseOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDiseaseOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-30">
                            {diseases.length > 0 ? (
                              diseases.map(d => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectDisease(d);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-[var(--color-text)] flex justify-between"
                                >
                                  <span>{d.name}</span>
                                  <span className="text-xs text-gray-400 font-mono self-center">{d.code}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">No diseases found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Time Resolution
                      </label>
                      <div className="relative">
                        <FaClock className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          value={config.timeResolution}
                          onChange={(e) =>
                            setConfig({ ...config, timeResolution: e.target.value })
                          }
                          required
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Admin Level
                      </label>
                      <div className="relative">
                        <FaGlobeAmericas className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                          value={config.adminLevel}
                          onChange={(e) => setConfig({ ...config, adminLevel: e.target.value })}
                          required
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          <option value="0">Country</option>
                          <option value="1">State</option>
                          <option value="2">Municipality</option>
                          <option value="3">Sub-Municipal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-gray-500">
                        Variable Type
                      </label>
                      <div className="flex bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, varType: "quantitative" })}
                          className={clsx(
                            "flex-1 py-1.5 text-sm rounded-md transition-all",
                            config.varType === "quantitative"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-text font-medium"
                              : "text-gray-500"
                          )}
                        >
                          Quantitative
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, varType: "categorical" })}
                          className={clsx(
                            "flex-1 py-1.5 text-sm rounded-md transition-all",
                            config.varType === "categorical"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-text font-medium"
                              : "text-gray-500"
                          )}
                        >
                          Categorical
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <Toggle
                      label="Sprint"
                      checked={config.sprint}
                      onChange={(v) => setConfig({ ...config, sprint: v })}
                    />
                    <Toggle
                      label="Spatial"
                      checked={config.spatial}
                      onChange={(v) => setConfig({ ...config, spatial: v })}
                    />
                    <Toggle
                      label="Temporal"
                      checked={config.temporal}
                      onChange={(v) => setConfig({ ...config, temporal: v })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("selection")}
                      className="flex-1 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !config.disease || !config.timeResolution || !config.adminLevel}
                      className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        "Initiate Verification"
                      )}
                    </button>
                  </div>

                  {error && <p className="text-sm text-center text-red-500 mt-2">{error}</p>}
                </form>
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
