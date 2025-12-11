'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaGitlab, FaKey, FaCopy, FaSync, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash, FaLink } from 'react-icons/fa';
import clsx from 'clsx';
import { oauthLogin } from '@/lib/api/auth';

export default function AuthSettingsPage() {
  const pathname = usePathname();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [githubAppStatus, setGithubAppStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [loadingKey, setLoadingKey] = useState(false);

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
      await apiFetch('/user/repositories/github/', { auth: true });
      setGithubAppStatus('connected');
    } catch {
      setGithubAppStatus('missing');
    }
  };

  const fetchApiKey = async () => {
    try {
      const data = await apiFetch('/user/api-key/');
      setApiKey(data.api_key);
    } catch (err) {
      console.error("Failed to fetch API key");
    }
  };

  const fetchConnectedProviders = async () => {
    try {
      const connectedProviders = await apiFetch("/user/oauth/connections/", { auth: true });
      setConnectedProviders(connectedProviders);
    } catch (err) {
      console.error("Failed to fetch connections");
    }
  };

  const rotateKey = async () => {
    if (!confirm("Are you sure?")) return;

    setLoadingKey(true);
    try {
      const data = await apiFetch('/user/api-key/rotate/', { method: 'POST' });
      setApiKey(data.key);
    } catch (err) {
    } finally {
      setLoadingKey(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      alert("Copied to clipboard!");
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
              {isConnected ? `Connected to ${name}` : `Link your ${name} account`}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-xs font-medium">
            <FaCheckCircle /> Connected
          </div>
        ) : (
          <button
            onClick={() => handleOAuth(provider as "google" | "github" | "gitlab")}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-neutral-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FaLink /> Connect
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Authentication & API
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your connected accounts and developer credentials.
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connected Accounts</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Log in to Mosqlimate using these providers.
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">GitHub App Integration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grant permission to import repositories and track models.
              </p>
            </div>
          </div>

          <div>
            {githubAppStatus === 'loading' ? (
              <span className="text-sm text-gray-500">Checking...</span>
            ) : githubAppStatus === 'connected' ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm font-medium">
                <FaCheckCircle /> Installed
              </div>
            ) : (
              <a
                href={installUrl}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                <FaGithub /> Install App
              </a>
            )}
          </div>
        </div>

        {githubAppStatus === 'connected' && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <a
              href={installUrl}
              className="text-sm text-blue-600 hover:underline"
            >
              Configure repository access on GitHub &rarr;
            </a>
          </div>
        )}
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <FaKey size={20} className="text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal API Key</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use this key to authenticate CLI tools or external scripts.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 flex items-center gap-4 border border-gray-200 dark:border-neutral-700">
          <div className="flex-1 font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
            {apiKey ? (showKey ? apiKey : "••••••••••••••••••••••••••••••••") : "Loading..."}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
              title={showKey ? "Hide" : "Show"}
            >
              {showKey ? <FaEyeSlash /> : <FaEye />}
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
              title="Copy to clipboard"
            >
              <FaCopy />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FaExclamationTriangle className="text-amber-500" />
            <span>Pass this header: <code className="bg-gray-100 dark:bg-neutral-800 px-1 py-0.5 rounded">X-UID-Key: {apiKey ? apiKey.split(':')[0] + ':...' : '...'}</code></span>
          </div>

          <button
            onClick={rotateKey}
            disabled={loadingKey}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition font-medium disabled:opacity-50"
          >
            <FaSync className={clsx(loadingKey && "animate-spin")} /> Regenerate Key
          </button>
        </div>
      </div>
    </div>
  );
}
