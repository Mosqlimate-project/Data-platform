"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function GlobalLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-bg)] transition-opacity duration-700 ease-in-out">
      <div className="relative">
        <Image
          src="/mosquito.svg"
          alt="Loading..."
          width={150}
          height={150}
          className="animate-[pulse_1s_ease-in-out_infinite] opacity-80"
          priority
        />
      </div>
    </div>
  );
}
