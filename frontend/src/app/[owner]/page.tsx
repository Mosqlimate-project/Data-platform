import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Boxes,
  Building2,
  ExternalLink,
  UserRound,
  Users,
} from "lucide-react";
import { FRONTEND_SECRET, NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";

interface OwnerMember {
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

interface OwnerRepository {
  name: string;
  provider: string;
  url: string;
  active: boolean;
  has_model: boolean;
  category: string | null;
  time_resolution: string | null;
  description: string | null;
  predictions: number;
}

interface OwnerProfile {
  owner: string;
  type: "organization" | "user";
  display_name: string;
  avatar_url: string | null;
  homepage: string | null;
  provider_url: string | null;
  members: OwnerMember[];
  repositories: OwnerRepository[];
}

interface PageProps {
  params: Promise<{
    owner: string;
  }>;
}

function formatLabel(value: string | null) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function OwnerPage({ params }: PageProps) {
  const { owner } = await params;

  const res = await fetch(
    `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/`,
    {
      cache: "no-store",
      headers: {
        "x-internal-secret": FRONTEND_SECRET || "",
      },
    }
  );

  if (res.status !== 200) {
    notFound();
  }

  const data: OwnerProfile = await res.json();
  const isOrganization = data.type === "organization";
  const repositories = data.repositories ?? [];
  const members = data.members ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-6 border-b border-[var(--color-border)] pb-8 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-gray-100 dark:bg-neutral-800">
          {data.avatar_url ? (
            <img
              src={data.avatar_url}
              alt={data.display_name}
              className="h-full w-full object-cover"
            />
          ) : isOrganization ? (
            <Building2 className="h-8 w-8 text-gray-400" />
          ) : (
            <UserRound className="h-8 w-8 text-gray-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-3xl font-bold text-[var(--color-text)]">
              {data.display_name}
            </h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
              {isOrganization ? "Organization" : "User"}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-gray-500">@{data.owner}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {data.provider_url && (
              <a
                href={data.provider_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Profile
              </a>
            )}
            {data.homepage && (
              <a
                href={data.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Homepage
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-xl border border-[var(--color-border)] px-5 py-3">
            <p className="text-2xl font-bold text-[var(--color-text)]">
              {repositories.length}
            </p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Repositories
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] px-5 py-3">
            <p className="text-2xl font-bold text-[var(--color-text)]">
              {repositories.filter((repo) => repo.has_model).length}
            </p>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Models
            </p>
          </div>
        </div>
      </header>

      {isOrganization && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              Members
            </h2>
            <span className="text-sm text-gray-500">{members.length}</span>
          </div>

          {members.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {members.map((member) => (
                <Link
                  key={member.username}
                  href={`/${member.username}`}
                  className="flex items-center gap-3 rounded-full border border-[var(--color-border)] py-1.5 pl-1.5 pr-4 transition hover:bg-[var(--color-accent)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-4 w-4 text-gray-400" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--color-text)]">
                      {member.display_name}
                    </span>
                    <span className="block text-xs capitalize text-gray-500">
                      {member.role}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No members yet.</p>
          )}
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Repositories
          </h2>
          <span className="text-sm text-gray-500">{repositories.length}</span>
        </div>

        {repositories.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => {
              const href = repo.has_model
                ? `/${data.owner}/${repo.name}`
                : repo.url;
              const external = !repo.has_model;
              const category = formatLabel(repo.category);
              const timeResolution = formatLabel(repo.time_resolution);

              return (
                <Link
                  key={repo.name}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[var(--color-text)]">
                        {repo.name}
                      </h3>
                      <p className="text-xs capitalize text-gray-500">
                        {repo.provider}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        repo.has_model
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-neutral-800"
                      }`}
                    >
                      {repo.has_model ? "Model" : "Repository"}
                    </span>
                  </div>

                  {repo.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-gray-500">
                      {repo.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {category && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {category}
                      </span>
                    )}
                    {timeResolution && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                        {timeResolution}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-gray-500">
                    <span>
                      {repo.has_model
                        ? `${repo.predictions.toLocaleString()} predictions`
                        : "View on provider"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <Boxes className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              No active repositories yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
