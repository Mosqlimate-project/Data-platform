"use client";

import { useRouter } from "next/navigation";

interface ThumbnailProps {
  owner: string;
  repo: string;
  avatarUrl: string | null;
  disease: string;
  predictions: number;
  lastUpdate: Date;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

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
  avatarUrl,
  disease,
  predictions,
  lastUpdate
}: ThumbnailProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/model/${owner}/${repo}`);
  };

  const imageSrc = avatarUrl || "/mosquito.svg";

  return (
    <div
      onClick={handleClick}
      className="
        flex flex-col
        p-4 rounded-xl border border-[var(--color-border)]
        transition cursor-pointer w-full
        bg-[var(--color-bg)] hover:bg-[var(--color-accent)]
        group
      "
    >
      <div className="flex items-start gap-3 mb-3 w-full">
        <div className="relative w-10 h-10 overflow-hidden rounded-md bg-gray-200 flex-shrink-0 border border-gray-200 dark:border-gray-700">
          <img
            src={imageSrc}
            alt={repo}
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.src = "/mosquito.svg";
            }}
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

      <div className="flex items-center gap-2 mt-auto text-[11px] text-gray-500 group-hover:text-gray-200 w-full truncate">
        <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-white/20">
          <span className="font-medium">{disease}</span>
        </div>

        <span>•</span>

        <span className="truncate">
          {predictions > 0 ? predictions.toLocaleString() : 0} preds
        </span>

        <span>•</span>

        <span className="truncate">{timeAgo(lastUpdate)}</span>
      </div>
    </div>
  );
}
