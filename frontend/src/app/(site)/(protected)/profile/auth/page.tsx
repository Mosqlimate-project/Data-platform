'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaGitlab, FaKey, FaCopy, FaSync, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash, FaLink } from 'react-icons/fa';
import clsx from 'clsx';
import { oauthLogin } from '@/lib/api/auth';
import { useTranslation } from 'react-i18next';

export default function AuthSettingsPage() {
  const { t } = useTranslation('common');
  const pathname = usePathname();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [githubAppStatus, setGithubAppStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [loadingKey, setLoadingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  const initialized = useRef(false);

  const installUrl = `/api/user/oauth/install/github?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    checkGithubAppStatus();
    fetchApiKey();
    fetchConnectedProviders();
  }, []);

  const checkGithubAppStatus = async () => {
    try {
      const res = await fetch('/api/user/oauth/repositories/github');

      if (res.ok) {
        const repos = await res.json();
        if (Array.isArray(repos) && repos.length > 0) {
          setGithubAppStatus('connected');
        } else {
          setGithubAppStatus('missing');
        }
      } else {
        setGithubAppStatus('missing');
      }
    } catch {
      setGithubAppStatus('missing');
    }
  };

  const fetchApiKey = async () => {
    try {
      const res = await fetch('/api/user/api-key');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key);
      } else {
        console.error("Failed to fetch user api-key");
      }
    } catch (err) {
      console.error("Failed to fetch API key");
    }
  };

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

  const rotateKey = () => {
    setShowRegenerateModal(true);
  };

  const confirmRegenerateKey = async () => {
    setShowRegenerateModal(false);
    setLoadingKey(true);
    try {
      const res = await fetch('/api/user/api-key/refresh', { method: 'POST' });

      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKey(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  const handleOAuth = (provider: "google" | "github" | "gitlab") => {
    oauthLogin(provider, pathname);
  };

  const renderProviderRow = (provider: string, icon: React.ReactNode, name: string) => {
    const isConnected = connectedProviders.includes(provider);

    return (
      <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-neutral-800 last:border-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 dark:bg-neutral-800 rounded-lg text-gray-700 dark:text-gray-200">
            {icon}
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">{name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? t('profile_auth.connected_to', { name }) : t('profile_auth.link_account', { name })}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-xs font-medium">
            <FaCheckCircle /> {t('profile_auth.connected')}
          </div>
        ) : (
          <button
            onClick={() => handleOAuth(provider as "google" | "github" | "gitlab")}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-neutral-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FaLink /> {t('profile_auth.connect')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile_auth.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile_auth.description')}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <FaKey size={20} className="text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile_auth.api_key_title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('profile_auth.api_key_desc')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 flex items-center gap-4 border border-gray-200 dark:border-neutral-700">
          <div className="flex-1 font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
            {apiKey ? (showKey ? apiKey : "••••••••••••••••••••••••••••••••") : t('profile.loading')}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
              title={showKey ? "Hide" : "Show"}
            >
              {showKey ? <FaEyeSlash /> : <FaEye />}
            </button>

            <div className="relative">
              {copied && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in duration-200">
                  {t('profile_auth.alerts.copied')}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
                title="Copy to clipboard"
              >
                {copied ? <FaCheckCircle /> : <FaCopy />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FaExclamationTriangle className="text-amber-500" />
            <span>{t('profile_auth.header_hint')} <code className="bg-gray-100 dark:bg-neutral-800 px-1 py-0.5 rounded">X-UID-Key: {apiKey ? apiKey.split(':')[0] + ':...' : '...'}</code></span>
          </div>

          <button
            onClick={rotateKey}
            disabled={loadingKey}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition font-medium disabled:opacity-50"
          >
            <FaSync className={clsx(loadingKey && "animate-spin")} /> {t('profile_auth.regenerate')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile_auth.connected_accounts')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile_auth.connected_desc')}
          </p>
        </div>

        <div className="flex flex-col">
          {renderProviderRow('google', <FcGoogle />, 'Google')}
          {renderProviderRow('github', <FaGithub />, 'GitHub')}
          {renderProviderRow('gitlab', <FaGitlab />, 'GitLab')}
        </div>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <FaGithub size={24} className="text-gray-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile_auth.github_app_title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('profile_auth.github_app_desc')}
              </p>
              {!connectedProviders.includes('github') && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {t('profile_auth.github_link_warning')}
                </p>
              )}
            </div>
          </div>

          <div>
            {githubAppStatus === 'loading' ? (
              <span className="text-sm text-gray-500">{t('profile_auth.checking')}</span>
            ) : githubAppStatus === 'connected' ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm font-medium">
                <FaCheckCircle /> {t('profile_auth.installed')}
              </div>
            ) : connectedProviders.includes('github') ? (
              <a
                href={installUrl}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                <FaGithub /> {t('profile_auth.install_app')}
              </a>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-gray-200 dark:bg-neutral-800 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium"
              >
                <FaGithub /> {t('profile_auth.install_app')}
              </button>
            )}
          </div>
        </div>

        {githubAppStatus === 'connected' && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <a
              href={installUrl}
              className="text-sm text-blue-600 hover:underline"
            >
              {t('profile_auth.configure_github')} &rarr;
            </a>
          </div>
        )}
      </div>

      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <FaExclamationTriangle className="text-red-600 dark:text-red-500 text-xl" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('profile_auth.regenerate_key')}
                </h3>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                {t('profile_auth.alerts.confirm_regenerate')}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmRegenerateKey}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                >
                  {t('profile_auth.confirm_regenerate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
