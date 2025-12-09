'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { FaGithub, FaKey, FaCopy, FaSync, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import clsx from 'clsx';

export default function AuthSettingsPage() {
  const pathname = usePathname();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [githubStatus, setGithubStatus] = useState<'loading' | 'connected' | 'missing'>('loading');
  const [loadingKey, setLoadingKey] = useState(false);

  const installUrl = `/oauth/install/github?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    checkGithubStatus();
    fetchApiKey();
  }, []);

  const checkGithubStatus = async () => {
    try {
      // Reuse the repository listing to check if we have access.
      // If this returns 401 or empty list, we might prompt to configure.
      // Ideally, you'd have a specific endpoint like /user/connections/github
      // For now, we assume if we can list repos, we are connected.
      await apiFetch('/user/repositories/github');
      setGithubStatus('connected');
    } catch {
      setGithubStatus('missing');
    }
  };

  const fetchApiKey = async () => {
    try {
      const data = await apiFetch('/user/api-key/');
      setApiKey(data.key);
    } catch (err) {
      console.error("Failed to fetch API key");
    }
  };

  const rotateKey = async () => {
    if (!confirm("Are you sure? This will invalidate your existing API key everywhere.")) return;

    setLoadingKey(true);
    try {
      const data = await apiFetch('/user/api-key/rotate/', { method: 'POST' });
      setApiKey(data.key);
      alert("New API Key generated.");
    } catch (err) {
      alert("Failed to rotate key.");
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <FaGithub size={24} className="text-gray-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">GitHub App</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Required for importing repositories and tracking models.
              </p>
            </div>
          </div>

          <div>
            {githubStatus === 'loading' ? (
              <span className="text-sm text-gray-500">Checking...</span>
            ) : githubStatus === 'connected' ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm font-medium">
                <FaCheckCircle /> Connected
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

        {githubStatus === 'connected' && (
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
