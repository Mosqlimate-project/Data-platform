import { FRONTEND_SECRET } from "@/lib/env";

export type DashboardCategory = "quantitative" | "categorical";
export type CaseDefinition = "reported" | "probable";
export type AdmLevel = 0 | 1 | 2 | 3;

export interface PredictionScore {
  name: "mae_score" | "mse_score" | "crps_score" | "log_score" | "interval_score" | "wis_score";
  score: number | null;
}

export interface Prediction {
  id: number;
  owner: string;
  repository: string;
  start: string;
  end: string;
  case_definition: CaseDefinition;
  sprint: number | null;
  scores: PredictionScore[];
}

export interface PredictionMetadata {
  id: number;
  disease_code: string;
  adm_level: AdmLevel;
  case_definition: CaseDefinition;
  adm_0_code: string | null;
  adm_1_code: string | null;
  adm_2_code: string | null;
  sprint: boolean;
}

export interface Option {
  geocode: string;
  name: string;
}

export interface DiseaseOption {
  code: string;
  name: string;
}

export interface SprintOption {
  id: number;
  year: number;
}

export interface CaseData {
  date: string;
  cases: number;
}

export interface PredictionRowData {
  date: string;
  pred: number;
  lower_95?: number;
  lower_90?: number;
  lower_80?: number;
  lower_50?: number;
  upper_50?: number;
  upper_80?: number;
  upper_90?: number;
  upper_95?: number;
}

const getHeaders = async () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-secret": FRONTEND_SECRET || "",
  };

  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      headers["cookie"] = `access_token=${token}`;
    }
  }

  return headers;
};

const getBaseUrl = (path: string) => {
  if (typeof window !== "undefined") return path;
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "";
  return `${baseUrl}${path}`;
};

export const fetchPredictionMetadata = async (predictionId: string): Promise<PredictionMetadata> => {
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/prediction/${predictionId}/metadata/`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Metadata fetch failed");
  return res.json();
};

export const fetchDiseases = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  sprint: boolean = false
): Promise<DiseaseOption[]> => {
  const params = new URLSearchParams({
    category,
    adm_level: admLevel.toString(),
    sprint: sprint.toString(),
  });
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/diseases?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch diseases");
  return res.json();
};

export const fetchCountries = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  disease: string,
  sprint: boolean = false
): Promise<Option[]> => {
  const params = new URLSearchParams({
    category,
    adm_level: admLevel.toString(),
    disease,
    sprint: sprint.toString()
  });
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/countries?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch countries");
  return res.json();
};

export const fetchStates = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  disease: string,
  country: string,
  sprint: boolean = false
): Promise<Option[]> => {
  const params = new URLSearchParams({
    category,
    adm_level: admLevel.toString(),
    disease,
    country,
    sprint: sprint.toString(),
  });
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/states?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch states");
  return res.json();
};

export const fetchCities = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  disease: string,
  country: string,
  state: string,
  sprint: boolean = false
): Promise<Option[]> => {
  const params = new URLSearchParams({
    category,
    adm_level: admLevel.toString(),
    disease,
    country,
    state,
    sprint: sprint.toString(),
  });
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/cities?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
};

export const fetchSprints = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  disease: string,
  country?: string,
  state?: string,
  city?: string
): Promise<SprintOption[]> => {
  const params = new URLSearchParams({ category, adm_level: admLevel.toString(), disease });

  if (admLevel == 0 && country) params.append("country", country);
  if (admLevel == 1 && state) params.append("state", state);
  if (admLevel == 2 && city) params.append("city", city);

  const res = await fetch(getBaseUrl(`/api/vis/dashboard/sprints?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch sprints");
  return res.json();
};

export const fetchPredictions = async (
  category: DashboardCategory,
  admLevel: AdmLevel,
  disease: string,
  caseDefinition: CaseDefinition,
  country?: string,
  state?: string,
  city?: string,
  sprint: boolean = false
): Promise<Prediction[]> => {
  const params = new URLSearchParams({
    category,
    adm_level: admLevel.toString(),
    disease,
    case_definition: caseDefinition,
    sprint: sprint.toString(),
  });

  if (admLevel == 0 && country) params.append("country", country);
  if (admLevel == 1 && state) params.append("state", state);
  if (admLevel == 2 && city) params.append("city", city);

  const res = await fetch(getBaseUrl(`/api/vis/dashboard/predictions?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch predictions");
  return res.json();
};

export const fetchCases = async (
  disease: string,
  admLevel: AdmLevel,
  sprint: boolean,
  caseDefinition: CaseDefinition,
  start: string,
  end: string,
  adm0: string,
  adm1?: string,
  adm2?: string
): Promise<CaseData[]> => {
  const params = new URLSearchParams({
    disease,
    adm_level: admLevel.toString(),
    sprint: sprint.toString(),
    case_definition: caseDefinition,
    start,
    end,
  });

  if (admLevel == 0) params.append("adm_0", adm0);
  if (admLevel == 1 && adm1) params.append("adm_1", adm1);
  if (admLevel == 2 && adm2) params.append("adm_2", adm2);

  const res = await fetch(getBaseUrl(`/api/vis/dashboard/cases?${params.toString()}`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
};

export const fetchPredictionData = async (predictionId: number): Promise<PredictionRowData[]> => {
  const res = await fetch(getBaseUrl(`/api/vis/dashboard/prediction/${predictionId}/`), {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch prediction data");
  return res.json();
};
