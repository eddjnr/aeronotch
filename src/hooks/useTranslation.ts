import { useSettingsStore } from "../stores/settings-store";
import { translations } from "../i18n/translations";

export function useTranslation() {
  const language = useSettingsStore((s) => s.language) || 'en';

  const t = (
    key: keyof typeof translations.en,
    replacements?: Record<string, string | number>
  ) => {
    const translationSet = translations[language] || translations.en;
    let text = (translationSet[key] || translations.en[key] || String(key)) as string;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return { t, language };
}
export type TranslationKey = keyof typeof translations.en;

export function getWeatherDescriptionKey(code: number): string {
  if (code === 0) return 'weather_0';
  if (code === 1) return 'weather_1';
  if (code === 2) return 'weather_2';
  if (code === 3) return 'weather_3';
  if (code >= 45 && code <= 48) return 'weather_45';
  if (code === 51 || code === 53 || code === 55) return 'weather_51';
  if (code === 56 || code === 57) return 'weather_56';
  if (code === 61 || code === 63 || code === 65) return 'weather_61';
  if (code === 66 || code === 67) return 'weather_66';
  if (code === 71 || code === 73 || code === 75) return 'weather_71';
  if (code === 77) return 'weather_77';
  if (code === 80 || code === 81 || code === 82) return 'weather_80';
  if (code === 85 || code === 86) return 'weather_85';
  if (code === 95) return 'weather_95';
  if (code === 96 || code === 99) return 'weather_96';
  return 'weather_unknown';
}
