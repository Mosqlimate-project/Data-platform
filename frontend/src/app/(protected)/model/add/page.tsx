'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGithub, FaGitlab, FaLink, FaArrowRight,
  FaSpinner, FaArrowLeft, FaSearch, FaCodeBranch, FaExclamationCircle,
  FaClock, FaCheck, FaLayerGroup, FaRunning, FaQuestionCircle
} from 'react-icons/fa';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { oauthLogin } from '@/lib/api/auth';
import NetworkBackground from "@/components/NetworkBackground";
import { useTranslation } from 'react-i18next';

interface Repository {
  id: string;
  name: string;
  url: string;
  private: boolean;
  provider: 'github' | 'gitlab';
  available: boolean;
}

interface Sprint {
  id: number;
  year: number;
  start_date: string;
  end_date: string;
}

const MODEL_CATEGORY_VALUES = [
  "quantitative",
  "categorical",
  "spatial_quantitative",
  "spatial_categorical",
  "spatio_temporal_quantitative",
  "spatio_temporal_categorical",
];

export default function AddModelPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const pathname = usePathname();

  const initialized = useRef(false);
  const theme = useTheme();
  const isDark = theme.resolvedTheme === "dark";

  const [step, setStep] = useState<'selection' | 'config' | 'verify'>('selection');

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [url, setUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');
  const [githubAppStatus, setGithubAppStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const installUrl = `/api/user/oauth/install/github?next=${encodeURIComponent(pathname)}`;

  const [activeSprints, setActiveSprints] = useState<Sprint[]>([]);

  const [config, setConfig] = useState({
    timeResolution: "",
    category: "",
    sprint: "",
  });

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

      const fetchSprints = async () => {
        try {
          const res = await fetch("/api/registry/model/add/sprint/actives");
          if (res.ok) {
            const data = await res.json();
            setActiveSprints(data);
          }
        } catch (err) {
          console.error(err);
        }
      };

      const fetchProvider = async (provider: 'github' | 'gitlab') => {
        try {
          const res = await fetch(`/api/user/oauth/repositories/${provider}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              if (provider === 'github') {
                setGithubAppStatus(data.length > 0 ? 'connected' : 'missing');
              }
              results.push(...data.map((r: any) => ({ ...r, provider })));
            }
          } else if (provider === 'github') setGithubAppStatus('missing');
        } catch (err) {
          if (provider === 'github') setGithubAppStatus('missing');
        }
      };

      await Promise.all([
        fetchProvider('github'),
        fetchProvider('gitlab'),
        fetchSprints(),
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
      setError(t('add_model.selection.errors.already_imported'));
      return;
    }

    if (!matchedRepo && !repos.some(r => normalize(r.url) === cleanInput)) {
      setError(t('add_model.selection.errors.invalid_repo'));
      return;
    }

    setSelectedRepo(matchedRepo || null);
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
      time_resolution: config.timeResolution,
      category: config.category,
      sprint: config.sprint ? parseInt(config.sprint) : null,
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
        throw new Error(data.message || t('add_model.verify.errors.import_failed'));
      }

      const modelPath = getModelName(url).replace(/\.git$/, '');
      router.push(modelPath ? `/${modelPath}/predictions` : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('add_model.verify.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NetworkBackground />
      <div className="z-10 max-w-2xl mx-auto mt-10 px-4 mb-20">
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
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{t('add_model.title')}</h1>
                    <p className="text-[var(--color-text)] opacity-60">
                      {t('add_model.selection.description')}
                    </p>
                  </div>

                  <form onSubmit={handleManualUrlSubmit} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLink className="text-gray-400" />
                    </div>
                    <input
                      type="url"
                      placeholder={t('add_model.selection.placeholder_url')}
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={loading}
                      className="block w-full pl-10 pr-24 py-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!url || loading}
                      className="absolute right-1 top-1 bottom-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm disabled:opacity-0"
                    >
                      {t('add_model.selection.next')}
                    </button>
                  </form>

                  <div className="flex items-center gap-4">
                    <div className="h-px bg-[var(--color-border)] flex-1" />
                    <span className="text-xs text-[var(--color-text)] opacity-40 uppercase font-semibold">
                      {t('add_model.selection.or_select')}
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
                          {t(`add_model.selection.tabs.${tab}`)}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        placeholder={t('add_model.selection.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg bg-gray-50 dark:bg-black/20">
                    {loadingRepos ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--color-text)] opacity-50 gap-2">
                        <FaSpinner className="animate-spin text-xl" />
                        <span className="text-sm">{t('add_model.selection.loading')}</span>
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
                                isAvailable ? "hover:bg-[var(--color-hover)]" : "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5"
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
                                  <FaCheck size={10} /> {t('add_model.selection.imported')}
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
                            <h3 className="text-base font-medium mb-1">{t('add_model.selection.connect.github_title')}</h3>
                            <button
                              onClick={() => oauthLogin("github", pathname)}
                              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition"
                            >
                              <FaLink /> {t('add_model.selection.connect.github_btn')}
                            </button>
                          </>
                        ) : activeTab === 'github' && githubAppStatus !== 'connected' ? (
                          <>
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                              <FaGithub className="text-2xl" />
                            </div>
                            <h3 className="text-base font-medium mb-1">{t('add_model.selection.connect.github_app_title')}</h3>
                            <a
                              href={installUrl}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                            >
                              <FaGithub /> {t('add_model.selection.connect.github_app_btn')}
                            </a>
                          </>
                        ) : activeTab === 'gitlab' && !connectedProviders.includes('gitlab') ? (
                          <>
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                              <FaGitlab className="text-2xl text-orange-600" />
                            </div>
                            <h3 className="text-base font-medium mb-1">{t('add_model.selection.connect.gitlab_title')}</h3>
                            <a
                              href="/profile/auth"
                              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition"
                            >
                              <FaLink /> {t('add_model.selection.connect.gitlab_btn')}
                            </a>
                          </>
                        ) : (
                          <>
                            <FaCodeBranch className="icon-sm mb-2 opacity-50" />
                            <p className="opacity-50">{t('add_model.selection.empty.title')}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-lg flex items-center gap-2">
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
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{getModelName(url)}</h1>
                    <p className="text-[var(--color-text)] opacity-60">
                      {t('add_model.config.description')}
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
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">
                          {t('add_model.config.time_res_label')}
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
                            <option value="" disabled>{t('add_model.config.options.select')}</option>
                            <option value="day">{t('add_model.config.options.day')}</option>
                            <option value="week">{t('add_model.config.options.week')}</option>
                            <option value="month">{t('add_model.config.options.month')}</option>
                            <option value="year">{t('add_model.config.options.year')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">
                          {t('add_model.config.category_label')}
                        </label>
                        <div className="relative">
                          <FaLayerGroup className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            value={config.category}
                            onChange={(e) => setConfig({ ...config, category: e.target.value })}
                            required
                          >
                            <option value="" disabled>{t('add_model.config.options.select')}</option>
                            {MODEL_CATEGORY_VALUES.map((cat) => (
                              <option key={cat} value={cat}>
                                {t(`add_model.config.options.${cat}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {activeSprints.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold uppercase text-gray-500">
                            {t('add_model.config.sprint_label')}
                          </label>
                          <a href="https://sprint.mosqlimate.org/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                            <FaQuestionCircle className="w-4 h-4" />
                          </a>
                        </div>
                        <div className="relative">
                          <FaRunning className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            value={config.sprint}
                            onChange={(e) => setConfig({ ...config, sprint: e.target.value })}
                          >
                            <option value="">{t('add_model.config.sprint_placeholder')}</option>
                            {activeSprints.map((s) => (
                              <option key={s.id} value={s.id}>{s.year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep("selection")}
                        className="flex-1 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
                      >
                        {t('add_model.config.back')}
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !config.timeResolution || !config.category}
                        className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : t('add_model.config.continue')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{t('add_model.verify.title')}</h1>
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3 bg-white dark:bg-white/5">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                        <FaCodeBranch />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{getModelName(url)}</h3>
                        <p className="text-xs text-[var(--color-text)] opacity-50 truncate font-mono">{url}</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-6">
                      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t('add_model.config.time_res_label')}</label>
                          <div className="flex items-center gap-2 mt-1 text-[var(--color-text)] capitalize">
                            <FaClock className="text-gray-400 text-xs" />
                            {config.timeResolution ? t(`add_model.config.options.${config.timeResolution}`) : ''}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t('add_model.config.category_label')}</label>
                          <div className="mt-1 text-[var(--color-text)]">
                            {config.category ? t(`add_model.config.options.${config.category}`) : ''}
                          </div>
                        </div>
                      </div>

                      {config.sprint && (
                        <div>
                          <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t('add_model.verify.features')}</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 text-xs font-medium border border-purple-200 flex items-center gap-1">
                              <FaRunning size={10} />
                              IMDC {activeSprints.find(s => String(s.id) === config.sprint)?.year || "Unknown"}
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
                      <FaArrowLeft size={12} /> {t('add_model.config.back')}
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={loading}
                      className="flex-[2] flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="animate-spin" /> : t('add_model.verify.confirm')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
