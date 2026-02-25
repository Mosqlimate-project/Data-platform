'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loadingUser, openLogin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loadingUser) return;

    if (!user) {
      setIsAuthorized(false);
      openLogin();
    } else {
      setIsAuthorized(true);
    }
  }, [user, loadingUser, openLogin, pathname]);

  useEffect(() => {
    const handleLoginCancel = () => {
      if (!user) {
        router.push("/");
      }
    };

    window.addEventListener("login-cancelled", handleLoginCancel);
    return () => window.removeEventListener("login-cancelled", handleLoginCancel);
  }, [user, router]);

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user && !isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center text-center p-4">
      </div>
    );
  }

  return <>{children}</>;
}
