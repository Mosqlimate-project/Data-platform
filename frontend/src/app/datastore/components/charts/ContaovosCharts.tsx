"use client";

import { useTranslation } from "react-i18next";

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
}

export function EggCountChart({ geocode, start, end }: ChartProps) {
  const { t } = useTranslation('common');

  return (
    <div className="w-full h-[400px] flex items-center justify-center border rounded-md bg-card text-card-foreground shadow-sm">
      <p className="text-muted-foreground opacity-70 font-medium">
        {t('charts_contaovos.unavailable')}
      </p>
    </div>
  );
}
