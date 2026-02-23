"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AdmLevel, CaseDefinition } from "@/lib/dashboard/api";

interface DashboardState {
  disease: string;
  adm_level: AdmLevel;
  adm_0: string;
  adm_1: string;
  adm_2: string;
  sprint: boolean;
  case_definition: CaseDefinition;
  prediction_id: string | null;
}

interface DashboardContextType {
  state: DashboardState;
  updateState: (updates: Partial<DashboardState>) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(() => {
    if (typeof window === "undefined") return {
      disease: "", adm_level: 1, adm_0: "", adm_1: "", adm_2: "", sprint: false, case_definition: "reported", prediction_id: null
    };

    const params = new URLSearchParams(window.location.search);
    return {
      disease: params.get("disease") || "",
      adm_level: (Number(params.get("adm_level")) || 1) as AdmLevel,
      adm_0: params.get("adm_0") || "",
      adm_1: params.get("adm_1") || "",
      adm_2: params.get("adm_2") || "",
      sprint: params.get("sprint") === "true",
      case_definition: (params.get("case_definition") as CaseDefinition) || "reported",
      prediction_id: params.get("prediction_id"),
    };
  });

  const updateState = (updates: Partial<DashboardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <DashboardContext.Provider value={{ state, updateState }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within a DashboardProvider");
  return context;
}
