import React from "react";
import Dashboard from "@/components/dashboard/Dashboard";

interface PageProps {
  params: {
    category: string;
  };
  searchParams: {
    adm_level?: string;
    adm_1?: string;
    adm_2?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function Page({ params }: PageProps) {
  const { category } = params;

  return <Dashboard category={category as any} />;
}
