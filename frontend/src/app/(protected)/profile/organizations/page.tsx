'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaCheckCircle, FaGithub, FaGitlab } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';

type Provider = 'github' | 'gitlab';

interface OAuthOrganization {
  name: string;
  provider: Provider;
  avatar_url: string | null;
  imported: boolean;
}

export default function OrganizationsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  const [provider, setProvider] = useState<Provider>('github');
  const [organizations, setOrganizations] = useState<OAuthOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);
      setError(null);
      setNotConnected(false);

      try {
        const res = await fetch(`/api/user/organizations/${provider}`);

        if (res.status === 404) {
          setOrganizations([]);
          setNotConnected(true);
          return;
        }

        if (!res.ok) {
          throw new Error(t('profile_organizations.errors.load'));
        }

        const data = await res.json();
        setOrganizations(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('profile_organizations.errors.load')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [provider]);

  const handleImport = async (organization: OAuthOrganization) => {
    setImporting(organization.name);
    setManualName('');
    setError(null);

    try {
      const res = await fetch(
        `/api/user/organizations/${organization.provider}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: organization.name }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || t('profile_organizations.errors.import')
        );
      }

      const data = await res.json();
      router.push(`/${data.name}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile_organizations.errors.import')
      );
    } finally {
      setImporting(null);
    }
  };

  const providerIcon = (value: Provider) =>
    value === 'github' ? (
      <FaGithub className="h-4 w-4" />
    ) : (
      <FaGitlab className="h-4 w-4 text-orange-600" />
    );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile_organizations.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile_organizations.description')}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
          {(['github', 'gitlab'] as Provider[]).map((value) => (
            <button
              key={value}
              onClick={() => setProvider(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                provider === value
                  ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {providerIcon(value)}
              <span className="capitalize">{value}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const name = manualName.trim();
            if (!name) return;
            handleImport({
              name,
              provider,
              avatar_url: null,
              imported: false,
            });
          }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <input
            type="text"
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
            placeholder={t('profile_organizations.name_placeholder')}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-[var(--color-bg)] px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:text-white sm:w-56"
          />
          <button
            type="submit"
            disabled={!manualName.trim() || importing === manualName.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {importing === manualName.trim() && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {t('profile_organizations.import')}
          </button>
        </form>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Link
            href="/profile/auth"
            className="shrink-0 font-medium underline hover:no-underline"
          >
            {t('profile_organizations.manage_connections')}
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-neutral-700 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : notConnected ? (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile_organizations.not_connected', { provider })}
          </p>
          <Link
            href="/profile/auth"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('profile_organizations.manage_connections')}
          </Link>
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-700 p-12 text-center">
          <FaBuilding className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile_organizations.empty', { provider })}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-gray-400">
            {t('profile_organizations.empty_hint')}
          </p>
          {provider === 'github' ? (
            <a
              href="/api/user/oauth/install/github?next=%2Fprofile%2Forganizations"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('profile_organizations.install_app')}
            </a>
          ) : (
            <Link
              href="/profile/auth"
              className="mt-4 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
            >
              {t('profile_organizations.manage_connections')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {organizations.map((organization) => (
            <div
              key={`${organization.provider}-${organization.name}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-[var(--color-bg)] p-4 dark:border-neutral-700"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                  {organization.avatar_url ? (
                    <img
                      src={organization.avatar_url}
                      alt={organization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FaBuilding className="h-4 w-4 text-gray-400" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {organization.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs capitalize text-gray-500">
                    {providerIcon(organization.provider)}
                    {organization.provider}
                  </p>
                </div>
              </div>

              {organization.imported ? (
                <Link
                  href={`/${organization.name}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                >
                  <FaCheckCircle />
                  {t('profile_organizations.view')}
                </Link>
              ) : (
                <button
                  onClick={() => handleImport(organization)}
                  disabled={importing === organization.name}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {importing === organization.name && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {t('profile_organizations.import')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
