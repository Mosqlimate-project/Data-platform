"use client";

import Image from "next/image";

interface ThumbnailProps {
  repo: string;
  type: string;
  predictions: number;
  lastUpdate: Date;
  onClick?: () => void;
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

export default function Thumbnail({ repo, type, predictions, lastUpdate, onClick }: ThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className="
    flex flex-col
    p-3 rounded-xl border border-[var(--color-border)]
    transition cursor-pointer w-full
    bg-[var(--color-bg)] hover:bg-[var(--color-accent)]
    hover:text-white 
  "
    >
      <div className="flex items-center gap-2 mb-2 w-full">
        <div className="w-6 h-6 overflow-hidden rounded bg-gray-200 flex-shrink-0">
          <Image
            src="/mosquito.svg"
            alt={repo}
            width={24}
            height={24}
            className="object-cover w-full h-full"
          />
        </div>

        <span className="font-medium truncate">{repo}</span>
      </div>

      <div className="flex items-center gap-2 mt-2 text-[12px] w-full truncate">
        <div className="flex items-center gap-1 truncate">
          <span className="truncate">{type}</span>
        </div>

        <span>•</span>

        <div className="flex items-center gap-1 truncate">
          <span>{predictions} prediction{predictions !== 1 ? "s" : ""}</span>
        </div>

        <span>•</span>

        <div className="flex items-center gap-1 truncate">
          <span>{timeAgo(lastUpdate)}</span>
        </div>
      </div>
    </div>
  );
}
