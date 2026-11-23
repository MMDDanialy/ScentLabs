import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  BalanceDiagnostic,
  BalanceReport,
  FragranceNote,
  MatchResult,
  NoteLayer,
  ScentProfile,
} from '../types/fragrance';
import {
  formatLocaleDate,
  formatLocaleNumber,
  getDictionary,
  getLocalizedAccord,
  getLocalizedBalanceSummary,
  getLocalizedDiagnostic,
  getLocalizedFamily,
  getLocalizedLayer,
  getLocalizedMatchDifferences,
  getLocalizedMatchExplanation,
  getLocalizedMoodTag,
  getLocalizedNote,
  getLocalizedNoteNameByIdOrName,
  getLocalizedPreset,
  getLocalizedScentProfile,
  getLocalizedSeasonTag,
  resolveMessage,
} from './engineLocalization';
import type { Direction, Locale, LocalizedNoteCopy, LocalizedPresetCopy, TranslationResource } from './types';

export const LOCALE_STORAGE_KEY = 'vpl_locale';

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === 'fa' || raw === 'en') return raw;
  } catch {
    // Ignore storage read errors
  }
  return 'en';
}

function applyLocaleToDom(locale: Locale): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === 'fa' ? 'rtl' : 'ltr';
}

interface I18nContextValue {
  locale: Locale;
  dir: Direction;
  dict: TranslationResource;
  setLocale: (next: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  getNoteCopy: (note: FragranceNote) => LocalizedNoteCopy;
  getNoteName: (idOrName: string) => string;
  getPresetCopy: (presetId: string) => LocalizedPresetCopy;
  getFamilyLabel: (family: string) => string;
  getLayerLabel: (layer: NoteLayer) => string;
  getAccordLabel: (accord: string) => string;
  getMoodTagLabel: (tag: string) => string;
  getSeasonTagLabel: (tag: string) => string;
  getDiagnosticCopy: (
    diag: BalanceDiagnostic,
    balance: BalanceReport
  ) => { title: string; detail: string; suggestion: string };
  getBalanceSummaryCopy: (balance: BalanceReport) => string;
  getProfileCopy: (profile: ScentProfile) => { label: string; summary: string };
  getMatchExplanationCopy: (match: MatchResult) => string;
  getMatchDifferencesCopy: (match: MatchResult) => string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const dir: Direction = locale === 'fa' ? 'rtl' : 'ltr';
  const dict = getDictionary(locale);

  useEffect(() => {
    applyLocaleToDom(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      resolveMessage(locale, key, params),
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocaleNumber(locale, value, options),
    [locale]
  );

  const formatDate = useCallback(
    (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDate(locale, value, options),
    [locale]
  );

  const value: I18nContextValue = {
    locale,
    dir,
    dict,
    setLocale,
    t,
    formatNumber,
    formatDate,
    getNoteCopy: (note) => getLocalizedNote(locale, note),
    getNoteName: (idOrName) => getLocalizedNoteNameByIdOrName(locale, idOrName),
    getPresetCopy: (id) => getLocalizedPreset(locale, id),
    getFamilyLabel: (f) => getLocalizedFamily(locale, f),
    getLayerLabel: (l) => getLocalizedLayer(locale, l),
    getAccordLabel: (a) => getLocalizedAccord(locale, a),
    getMoodTagLabel: (tag) => getLocalizedMoodTag(locale, tag),
    getSeasonTagLabel: (tag) => getLocalizedSeasonTag(locale, tag),
    getDiagnosticCopy: (diag, bal) => getLocalizedDiagnostic(locale, diag, bal),
    getBalanceSummaryCopy: (bal) => getLocalizedBalanceSummary(locale, bal),
    getProfileCopy: (prof) => getLocalizedScentProfile(locale, prof),
    getMatchExplanationCopy: (match) => getLocalizedMatchExplanation(locale, match),
    getMatchDifferencesCopy: (match) => getLocalizedMatchDifferences(locale, match),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
