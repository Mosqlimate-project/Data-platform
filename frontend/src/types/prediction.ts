export interface PredictionPoint {
  date: string;
  upper_95: number;
  upper_50?: number;
  pred: number;
  lower_50?: number;
  lower_95: number;
}

export interface PredictionOut {
  id: number;
  name: string;
  color: string;
  description?: string;
  data: PredictionPoint[];
}
