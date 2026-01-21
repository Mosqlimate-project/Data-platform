'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGithub, FaGitlab, FaLink, FaArrowRight,
  FaSpinner, FaArrowLeft, FaSearch, FaCodeBranch, FaExclamationCircle,
  FaClock, FaMapMarkerAlt, FaCheck, FaTimes, FaGlobeAmericas, FaVirus, FaLayerGroup
} from 'react-icons/fa';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { oauthLogin } from '@/lib/api/auth';
import NetworkBackground from "@/components/NetworkBackground";


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

const MODEL_CATEGORIES = [
  { value: "quantitative", label: "Quantitative" },
  { value: "categorical", label: "Categorical" },
  { value: "spatial_quantitative", label: "Spatial Quantitative" },
  { value: "spatial_categorical", label: "Spatial Categorical" },
  { value: "spatio_temporal_quantitative", label: "Spatio-temporal Quantitative" },
  { value: "spatio_temporal_categorical", label: "Spatio-temporal Categorical" },
];

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

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [url, setUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');
  const [githubAppStatus, setGithubAppStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [isDiseaseOpen, setIsDiseaseOpen] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const installUrl = `/api/user/oauth/install/github?next=${encodeURIComponent(pathname)}`;
  const [isSprintActive, setIsSprintActive] = useState(false);

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
        if (data.length > 0) {
          setIsDiseaseOpen(true);
        } else {
          setIsDiseaseOpen(false);
        }
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
    category: "",
    sprint: false,
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
      const res = await fetch("/api/user/oauth/connections");
      if (res.ok) {
        const data = await res.json();
        setConnectedProviders(data);
      } else {
        console.error("Failed to fetch connections");
      }
    } catch (err) {
      console.error("Network error:", err);
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

      const checkSprintStatus = async () => {
        try {
          const res = await fetch("/api/registry/model/add/sprint/active");
          if (res.ok) {
            const active = await res.json();
            setIsSprintActive(active);
          }
        } catch (err) {
          console.error(err);
        }
      };

      const fetchProvider = async (provider: 'github' | 'gitlab') => {
        try {
          const res = await fetch('/api/user/oauth/repositories/github');

          if (res.ok) {
            const data = res.json();
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
          } else {
            setGithubAppStatus('missing');
          }
        } catch (err) {
          if (provider === 'github') setGithubAppStatus('missing');
        }
      };

      await Promise.all([
        fetchProvider('github'),
        fetchProvider('gitlab'),
        checkSprintStatus(),
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

  const handleRepoSelect = (repo: Repository) => {
    setError(null);
    setUrl(repo.url);
    setSelectedRepo(repo);
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

    if (matchedRepo) {
      setSelectedRepo(matchedRepo);
    } else {
      setSelectedRepo(null);
    }

    const exists = repos.some(r => normalize(r.url) === cleanInput);

    if (!exists) {
      setError("Please select a valid repository from the list or ensure your account is connected.");
      return;
    }

    setStep('config');
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('verify');
  };

  const handleImportConfirm = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      repo_url: url,
      repo_name: selectedRepo?.name,
      repo_id: selectedRepo?.id,
      repo_provider: selectedRepo?.provider.toLowerCase(),
      repo_private: selectedRepo?.private ?? false,
      disease_id: parseInt(config.disease),
      time_resolution: config.timeResolution,
      adm_level: parseInt(config.adminLevel),
      category: config.category,
      sprint: config.sprint,
    };

    try {
      const res = await fetch('/api/registry/model/add', {
        method: 'POST',
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not import repository.');
      }

      const modelPath = getModelName(url).replace(/\.git$/, '');
      if (modelPath) {
        router.push(`/${modelPath}/predictions`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
    <>
      <NetworkBackground />
      <div className="z-10 max-w-2xl mx-auto mt-10 px-4 mb-20 bg-">
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
                              onClick={() => isAvailable && handleRepoSelect(repo)}
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
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                            <option value="year">Yearly</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">
                          Admin Level
                        </label>
                        <div className="relative">
                          <FaMapMarkerAlt className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                          Model Category
                        </label>
                        <div className="relative">
                          <FaLayerGroup className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            value={config.category}
                            onChange={(e) => setConfig({ ...config, category: e.target.value })}
                            required
                          >
                            <option value="" disabled>
                              Select
                            </option>
                            {MODEL_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {isSprintActive && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <Toggle
                          label="Sprint"
                          checked={config.sprint}
                          onChange={(v) => setConfig({ ...config, sprint: v })}
                        />
                      </div>
                    )}

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
                        disabled={loading || !config.disease || !config.timeResolution || !config.adminLevel || !config.category}
                        className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          "Continue"
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
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                      Final Review
                    </h1>
                    <p className="text-[var(--color-text)] opacity-60">
                      Please review the model configuration before confirming the import.
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] rounded-xl overflow-hidden">

                    <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3 bg-white dark:bg-white/5">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <FaCodeBranch />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
                          {getModelName(url)}
                        </h3>
                        <p className="text-xs text-[var(--color-text)] opacity-50 truncate font-mono">
                          {url}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-6">

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Target Disease</label>
                        <div className="flex items-center gap-2 text-lg font-medium text-[var(--color-text)]">
                          <FaVirus className="text-gray-400 text-sm" />
                          {diseases.find(d => String(d.id) === config.disease)?.name || "Unknown Disease"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Time Resolution</label>
                          <div className="flex items-center gap-2 mt-1 text-[var(--color-text)] capitalize">
                            <FaClock className="text-gray-400 text-xs" />
                            {config.timeResolution}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Admin Level</label>
                          <div className="flex items-center gap-2 mt-1 text-[var(--color-text)]">
                            <FaGlobeAmericas className="text-gray-400 text-xs" />
                            {(() => {
                              switch (config.adminLevel) {
                                case "0": return "Country";
                                case "1": return "State";
                                case "2": return "Municipality";
                                case "3": return "Sub-Municipal";
                                default: return config.adminLevel;
                              }
                            })()}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Model Category</label>
                          <div className="mt-1 text-[var(--color-text)]">
                            {MODEL_CATEGORIES.find(c => c.value === config.category)?.label || config.category}
                          </div>
                        </div>
                      </div>

                      {config.sprint && (
                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Features</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800">
                              Sprint
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("config")}
                      className="flex-1 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors flex justify-center items-center gap-2"
                    >
                      <FaArrowLeft size={12} /> Back
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={loading}
                      className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        "Confirm"
                      )}
                    </button>
                  </div>

                  {error && (
                    <p className="text-sm text-center text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
