import { useTranslation } from "react-i18next";
import { useCallback } from "react";

export function useDateFormatter() {
  const { i18n } = useTranslation();

  const isEn = i18n.language.startsWith('en');
  const dateFormatPattern = isEn ? 'MM/DD/YYYY' : 'DD/MM/YYYY';

  const formatDate = useCallback((isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split('-');

    if (!year || !month || !day) return isoDate;

    return isEn
      ? `${month}/${day}/${year}`
      : `${day}/${month}/${year}`;
  }, [isEn]);

  return {
    dateFormatPattern,
    formatDate
  };
}
