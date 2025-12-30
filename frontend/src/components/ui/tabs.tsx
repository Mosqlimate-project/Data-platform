import Link from "next/link";
import { ReactNode } from "react";

export function TabNav({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-8 text-sm font-medium mb-8">
      {children}
    </div>
  );
}

interface TabLinkProps {
  href: string;
  isActive?: boolean;
  children: ReactNode;
}

export function TabLink({ href, isActive, children }: TabLinkProps) {
  return (
    <Link
      href={href}
      className={`pb-3 border-b-2 transition-colors ${isActive
        ? "border-border"
        : "border-transparent"
        }`}
    >
      {children}
    </Link>
  );
}
