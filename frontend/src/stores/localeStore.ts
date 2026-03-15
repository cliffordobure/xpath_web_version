import { create } from 'zustand';
import { getStoredLocale, setStoredLocale, type Locale } from '../i18n/translations';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrate: () => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: typeof window !== 'undefined' ? getStoredLocale() : 'en',
  setLocale: (locale) => {
    setStoredLocale(locale);
    set({ locale });
  },
  hydrate: () => set({ locale: getStoredLocale() }),
}));
