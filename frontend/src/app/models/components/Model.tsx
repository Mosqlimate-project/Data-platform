"use client";

import { useRouter } from "next/navigation";

interface ThumbnailProps {
  owner: string;
  repo: string;
  avatar_url: string | null;
  disease: string;
  predictions: number;
  last_update: number;
  category?: string;
  time_resolution?: string;
  adm_level?: string;
  imdc?: string;
}

function timeAgo(timestamp: number): string | null {
  if (!timestamp) return null;
  const dateValue = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diff = Math.floor((now - dateValue) / 1000);
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);
  const months = Math.floor(diff / 2592000);
  const years = Math.floor(diff / 31536000);

  if (diff < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export default function Thumbnail({
  owner,
  repo,
  avatar_url,
  disease,
  predictions,
  last_update,
  category,
  time_resolution,
  adm_level,
  imdc
}: ThumbnailProps) {
  const router = useRouter();
  const handleClick = () => router.push(`/${owner}/${repo}`);
  const imageSrc = avatar_url || "/mosquito.svg";

  return (
    <div
      onClick={handleClick}
      className="flex flex-col p-4 rounded-xl border border-[var(--color-border)] transition cursor-pointer w-full bg-[var(--color-bg)] hover:bg-[var(--color-accent)] group shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-3 mb-3 w-full">
        <div className="relative w-10 h-10 overflow-hidden rounded-md bg-gray-100 flex-shrink-0 border border-gray-200 dark:border-gray-700">
          <img
            src={imageSrc}
            alt={repo}
            className="object-cover w-full h-full"
            onError={(e) => { e.currentTarget.src = "/mosquito.svg"; }}
          />
        </div>

        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="font-semibold truncate text-[var(--color-text)] group-hover:text-white">
            {repo}
          </span>
          <span className="text-xs text-gray-500 truncate group-hover:text-gray-200">
            {owner}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge text={disease} color="blue" />
        {category && <Badge text={category} color="emerald" />}
        {time_resolution && <Badge text={time_resolution} color="amber" />}
        {adm_level && <Badge text={adm_level} color="purple" />}
        {imdc && <Badge text={imdc} color="rose" />}
      </div>

      <div className="flex items-center gap-2 mt-auto text-[11px] text-gray-500 group-hover:text-gray-200 w-full truncate border-t border-gray-100 dark:border-gray-800 pt-3 group-hover:border-white/10">
        <span className="truncate">
          {predictions > 0 ? predictions.toLocaleString() : 0} predicts
        </span>
        <span>•</span>
        <span className="truncate">{timeAgo(last_update)}</span>
      </div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[color]} group-hover:bg-white/20 group-hover:text-white`}>
      {text}
    </span>
  );
}
