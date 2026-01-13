import React from "react";
import { notFound } from "next/navigation";
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

export function generateStaticParams() {
  return [
    { category: "quantitative" },
    { category: "categorical" },
  ];
}

export default function Page({ params, searchParams }: PageProps) {
  const { category } = params;

  if (category !== "quantitative" && category !== "categorical") {
    return notFound();
  }

  return <Dashboard category={category} />;
}
