"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, openLogin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [blocked, setBlocked] = useState(true);

  const isProtected = pathname.startsWith("/profile");

  useEffect(() => {
    if (!isProtected) {
      setBlocked(false);
      return;
    }

    if (user === null) {
      openLogin();
      setBlocked(true);
    } else {
      setBlocked(false);
    }
  }, [user, openLogin, pathname, isProtected]);

  useEffect(() => {
    const handleCancel = () => {
      if (!user && isProtected) router.push("/");
    };

    window.addEventListener("login-cancelled", handleCancel);
    return () => window.removeEventListener("login-cancelled", handleCancel);
  }, [user, router, isProtected]);

  if (blocked) {
    return (
      <div className="pointer-events-none opacity-30">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
