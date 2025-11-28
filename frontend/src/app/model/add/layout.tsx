"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function ModelAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, openLogin } = useAuth();
  const router = useRouter();

  const [blocked, setBlocked] = useState(true);
  const [loginTriggered, setLoginTriggered] = useState(false);

  console.log(user);
  useEffect(() => {
    if (user) {
      setBlocked(false);
      return;
    }

    if (!loginTriggered) {
      setLoginTriggered(true);
      openLogin();
      setBlocked(true);
    }
  }, [user, loginTriggered, openLogin]);

  useEffect(() => {
    const handleCancel = () => {
      if (!user) router.push("/");
    };

    window.addEventListener("login-cancelled", handleCancel);
    return () => window.removeEventListener("login-cancelled", handleCancel);
  }, [user, router]);

  if (blocked) {
    return (
      <div className="pointer-events-none opacity-30">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
