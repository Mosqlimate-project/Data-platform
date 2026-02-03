"use client";

import { useState } from "react";
import { Pencil, Check, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Contributor {
  username: string;
  avatar_url: string | null;
}

interface ModelSidebarProps {
  owner: string;
  repository: string;
  initialDescription: string | null;
  contributors?: Contributor[];
  canManage: boolean;
}

export default function ModelSidebar({
  owner,
  repository,
  initialDescription,
  contributors = [],
  canManage,
}: ModelSidebarProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/registry/model/${owner}/${repository}/description/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!res.ok) throw new Error("Failed to update description");

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to save description");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">About</h3>
          {canManage && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-muted rounded"
              title="Edit description"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[120px] p-3 text-sm rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-y"
              placeholder="Enter a short description for this model..."
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDescription(initialDescription || "");
                }}
                disabled={isLoading}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
            {description || <span className="italic opacity-50">No description provided.</span>}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">Contributors</h3>

        {contributors && contributors.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {contributors.map((contributor) => (
              <Link
                key={contributor.username}
                href={`/${contributor.username}`}
                className="relative group"
                title={contributor.username}
              >
                <div className="w-10 h-10 rounded-full border bg-muted overflow-hidden relative">
                  {contributor.avatar_url ? (
                    <Image
                      src={contributor.avatar_url}
                      alt={contributor.username}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <User size={20} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic opacity-50">
            No contributors found.
          </div>
        )}
      </div>
    </div>
  );
}
