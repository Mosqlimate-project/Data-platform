"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="p-4 bg-destructive/10 rounded-full mb-4">
        <AlertTriangle size={32} className="text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Failed to load predictions
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        {error.message || "An unexpected error occurred while fetching predictions. Please try again."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}
