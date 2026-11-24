import { useCallback, useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { AdminCatalogModal } from './components/AdminCatalogModal';
import { ApothecaryLab } from './components/ApothecaryLab';
import { DiscoveryFlow } from './components/DiscoveryFlow';
import { LibraryDrawerOrModal } from './components/LibraryDrawerOrModal';
import { RevealAndPassport } from './components/RevealAndPassport';
import { FRAGRANCE_NOTES } from './data/catalog';
import {
  computeBalanceReport,
  deriveMoodAndSeasons,
  generateDeterministicCritique,
  generateFormulaCode,
  normalizeBlend,
} from './engine/formulationEngine';
import { ALGORITHM_VERSION } from './engine/similarityEngine';
import { getLocalizedCompositionTitle } from './i18n/engineLocalization';
import { useI18n } from './i18n/I18nContext';
import { atelierAudio } from './services/audioAndExport';
import { useTheme, type ThemePreference } from './theme/ThemeContext';
import type {
  AppStage,
  AtelierPreset,
  BlendSelection,
  CatalogStats,
  MatchApiResponse,
  PassportData,
  ScentProfile,
} from './types/fragrance';

const LIBRARY_STORAGE_KEY = 'vpl_saved_library_v1';

function loadSavedLibrary(): PassportData[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PassportData[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const { locale, setLocale, dict, t, formatNumber } = useI18n();
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [stage, setStage] = useState<AppStage>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'lab';
    }
    return 'discovery';
  });

  const [scentProfile, setScentProfile] = useState<ScentProfile | null>(null);
  const [selection, setSelection] = useState<BlendSelection>({});
  const [history, setHistory] = useState<BlendSelection[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [activePassport, setActivePassport] = useState<PassportData | null>(null);
  const [isDistilling, setIsDistilling] = useState(false);
  const [isCritiqueLoading, setIsCritiqueLoading] = useState(false);
  const [critiqueNotice, setCritiqueNotice] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [isAdminCatalogOpen, setIsAdminCatalogOpen] = useState(false);

  const [libraryItems, setLibraryItems] = useState<PassportData[]>(() => loadSavedLibrary());
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const fetchCatalogSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog/summary');
      if (res.ok) {
        const json = (await res.json()) as { stats?: CatalogStats };
        if (json.stats) setCatalogStats(json.stats);
      }
    } catch {
      // Keep graceful default if offline
    }
  }, []);

  useEffect(() => {
    void fetchCatalogSummary();
  }, [fetchCatalogSummary]);

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libraryItems));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [libraryItems]);

  const entries = useMemo(() => normalizeBlend(selection, FRAGRANCE_NOTES), [selection]);
  const balance = useMemo(() => computeBalanceReport(selection, FRAGRANCE_NOTES), [selection]);

  const updateBlend = useCallback((next: BlendSelection) => {
    setSelection((prev) => {
      setHistory((h) => [...h.slice(-24), prev]);
      return next;
    });
  }, []);

  const handleAdjustNote = useCallback(
    (noteId: string, delta: number) => {
      const current = selection[noteId] ?? 0;
      const nextVal = Math.max(0, Math.min(20, current + delta));
      if (nextVal === current) return;

      const next: BlendSelection = { ...selection };
      if (nextVal === 0) {
        delete next[noteId];
      } else {
        next[noteId] = nextVal;
      }

      if (delta > 0) {
        const note = FRAGRANCE_NOTES.find((n) => n.id === noteId);
        const pitch = note?.layer === 'top' ? 660 : note?.layer === 'heart' ? 520 : 410;
        atelierAudio.playDrop(pitch);
      }

      updateBlend(next);
    },
    [selection, updateBlend]
  );

  const handleRemoveNote = useCallback(
    (noteId: string) => {
      if (!(noteId in selection)) return;
      const next = { ...selection };
      delete next[noteId];
      updateBlend(next);
    },
    [selection, updateBlend]
  );

  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];
      setSelection(last);
      return prevHistory.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    if (Object.keys(selection).length === 0) return;
    updateBlend({});
  }, [selection, updateBlend]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      atelierAudio.setEnabled(next);
      return next;
    });
  }, []);

  const handleApplyProfileAndEnter = useCallback(
    (profile: ScentProfile, starterBlend: BlendSelection) => {
      setScentProfile(profile);
      setHistory([]);
      setSelection(starterBlend);
      setStage('lab');
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    []
  );

  const handleEnterLabDirect = useCallback(() => {
    setStage('lab');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleLoadPreset = useCallback(
    (preset: AtelierPreset) => {
      setHistory((h) => [...h.slice(-24), selection]);
      setSelection({ ...preset.selection });
      setStage('lab');
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [selection]
  );

  const fetchOptionalAiCritique = useCallback(
    async (passport: PassportData, isManualRefresh = false) => {
      setIsCritiqueLoading(true);
      setCritiqueNotice(null);
      try {
        const res = await fetch('/api/critique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            fragranceName: passport.fragranceName,
            alchemistName: passport.alchemistName,
            pyramid: passport.balance.pyramid,
            dominantFamily: passport.balance.dominantFamily,
            dominantAccords: passport.balance.dominantAccords,
            notes: passport.entries.map((e) => ({
              name: e.note.name,
              layer: e.note.layer,
              percentage: e.percentage,
            })),
            topMatch: passport.topMatches[0]
              ? {
                  name: passport.topMatches[0].perfume.name,
                  house: passport.topMatches[0].perfume.house,
                  similarityScore: passport.topMatches[0].similarityScore,
                  confidenceScore: passport.topMatches[0].confidenceScore,
                  matchTier: passport.topMatches[0].matchTier,
                  sharedNotes: passport.topMatches[0].sharedNotes,
                  sharedAccords: passport.topMatches[0].sharedAccords,
                  keyDifferences: passport.topMatches[0].keyDifferences,
                  completeness: passport.topMatches[0].perfume.completeness,
                }
              : null,
          }),
        });

        if (!res.ok) {
          if (isManualRefresh) {
            setCritiqueNotice(dict.reveal.critiqueUnavailableNotice);
          }
          return;
        }

        const data = (await res.json()) as {
          critique?: string | null;
          source?: 'ai' | 'deterministic';
          unavailable?: boolean;
        };
        if (data.critique) {
          setActivePassport((current) =>
            current && current.id === passport.id
              ? { ...current, editorialCritique: data.critique!, critiqueSource: 'ai' }
              : current
          );
        } else if (isManualRefresh) {
          setCritiqueNotice(dict.reveal.critiqueUnavailableNotice);
        }
      } catch {
        if (isManualRefresh) {
          setCritiqueNotice(dict.reveal.critiqueNetworkNotice);
        }
      } finally {
        setIsCritiqueLoading(false);
      }
    },
    [locale, dict.reveal.critiqueUnavailableNotice, dict.reveal.critiqueNetworkNotice]
  );

  const handleReveal = useCallback(async () => {
    if (balance.totalDrops === 0) return;

    const { moodTags, seasonTags } = deriveMoodAndSeasons(balance);
    const formulaCode = generateFormulaCode(entries);
    const defaultTitle = getLocalizedCompositionTitle(locale, entries, balance);

    const pendingId = `${formulaCode}-${Date.now()}`;
    const initialPassport: PassportData = {
      id: pendingId,
      formulaCode,
      fragranceName: defaultTitle,
      alchemistName: dict.reveal.defaultAlchemist,
      createdAt: new Date().toISOString(),
      totalDrops: balance.totalDrops,
      entries,
      balance,
      topMatches: [],
      moodTags,
      seasonTags,
      editorialCritique: generateDeterministicCritique(defaultTitle, entries, balance, null),
      critiqueSource: 'deterministic',
      algorithmVersion: ALGORITHM_VERSION,
      schemaVersion: 2,
    };

    setActivePassport(initialPassport);
    setCritiqueNotice(null);
    setMatchError(null);
    setIsDistilling(true);
    setStage('reveal');
    window.scrollTo({ top: 0, behavior: 'instant' });
    atelierAudio.playRevealChord();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minTransitionMs = prefersReducedMotion ? 120 : 650;
    const startedAt = Date.now();

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection, limit: 8 }),
      });

      if (!res.ok) {
        throw new Error(dict.reveal.matchErrorFallback);
      }

      const matchPayload = (await res.json()) as MatchApiResponse;
      const topMatches = matchPayload.matches ?? [];
      const deterministicCritique = generateDeterministicCritique(
        defaultTitle,
        entries,
        balance,
        topMatches[0] ?? null
      );

      const resolvedPassport: PassportData = {
        ...initialPassport,
        topMatches,
        matchSummary: {
          searchedCount: matchPayload.searchedCount,
          candidateCount: matchPayload.candidateCount,
          lowMatchNotice: matchPayload.lowMatchNotice,
          attributionName: matchPayload.attribution.name,
          attributionUrl: matchPayload.attribution.url,
          attributionLicense: matchPayload.attribution.license,
        },
        editorialCritique: deterministicCritique,
        critiqueSource: 'deterministic',
      };

      const elapsed = Date.now() - startedAt;
      if (elapsed < minTransitionMs) {
        await new Promise((r) => setTimeout(r, minTransitionMs - elapsed));
      }

      setActivePassport((current) =>
        current && current.id === pendingId
          ? {
              ...resolvedPassport,
              fragranceName: current.fragranceName,
              alchemistName: current.alchemistName,
            }
          : resolvedPassport
      );
      setIsDistilling(false);
      void fetchOptionalAiCritique(resolvedPassport);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : dict.reveal.matchErrorFallback);
      setIsDistilling(false);
    }
  }, [
    balance,
    entries,
    selection,
    locale,
    dict.reveal.defaultAlchemist,
    dict.reveal.matchErrorFallback,
    fetchOptionalAiCritique,
  ]);

  const handleSaveToLibrary = useCallback(() => {
    if (!activePassport) return;
    setLibraryItems((prev) => {
      const exists = prev.some((item) => item.id === activePassport.id);
      if (exists) {
        return prev.map((item) => (item.id === activePassport.id ? activePassport : item));
      }
      return [activePassport, ...prev];
    });
  }, [activePassport]);

  const handleLoadFromLibrary = useCallback((item: PassportData) => {
    const restored: BlendSelection = {};
    for (const entry of item.entries) {
      restored[entry.note.id] = entry.drops;
    }
    setSelection(restored);
    setHistory([]);
    setActivePassport(item);
    setMatchError(null);
    setIsLibraryOpen(false);
    setStage('lab');
  }, []);

  const handleOpenPassportFromLibrary = useCallback((item: PassportData) => {
    const restored: BlendSelection = {};
    for (const entry of item.entries) {
      restored[entry.note.id] = entry.drops;
    }
    setSelection(restored);
    setActivePassport(item);
    setMatchError(null);
    setIsDistilling(false);
    setIsLibraryOpen(false);
    setStage('reveal');
  }, []);

  const handleDuplicateFromLibrary = useCallback(
    (item: PassportData) => {
      const duplicate: PassportData = {
        ...item,
        id: `${item.formulaCode}-copy-${Date.now()}`,
        fragranceName: `${item.fragranceName} (${dict.library.duplicateSuffix})`,
        createdAt: new Date().toISOString(),
        schemaVersion: item.schemaVersion ?? 2,
      };
      setLibraryItems((prev) => [duplicate, ...prev]);
    },
    [dict.library.duplicateSuffix]
  );

  const handleDeleteFromLibrary = useCallback((id: string) => {
    setLibraryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isCurrentSaved = Boolean(
    activePassport && libraryItems.some((item) => item.id === activePassport.id)
  );

  const themeOptions: { id: ThemePreference; label: string; Icon: typeof Moon }[] = [
    { id: 'dark', label: dict.controls.themeDark, Icon: Moon },
    { id: 'light', label: dict.controls.themeLight, Icon: Sun },
    { id: 'system', label: dict.controls.themeSystem, Icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-[var(--vpl-bg)] text-[var(--vpl-text)] flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-[var(--vpl-border-gold-soft)] bg-[var(--vpl-bg-header)] sticky top-0 z-40 backdrop-blur-xs">
        <div className="mx-auto max-w-[1360px] px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Zone 1: Brand symbol + wordmark */}
          <button
            type="button"
            onClick={() => setStage('discovery')}
            className="flex items-center gap-1.5 sm:gap-2.5 whitespace-nowrap shrink-0 cursor-pointer text-start min-w-0"
          >
            <div
              className={`h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 ${
                isLight
                  ? 'rounded-lg p-1 bg-[#14110D] border border-[var(--vpl-border-gold)]'
                  : ''
              }`}
            >
              <img
                src="/virtual_perfume_lab_symbol_transparent.png"
                alt={dict.brand.emblemAlt}
                className="h-full w-full object-contain shrink-0"
              />
            </div>
            <span className="font-serif text-lg xl:text-2xl font-semibold tracking-tight text-[var(--vpl-text)] hidden sm:inline">
              {dict.brand.name}
            </span>
            <span className="font-serif text-[14px] font-semibold tracking-tight text-[var(--vpl-text)] sm:hidden">
              {dict.brand.shortName}
            </span>
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav
            className="hidden lg:flex items-center gap-6 text-sm font-medium"
            aria-label={dict.nav.primaryAria}
          >
            <button
              type="button"
              onClick={() => setStage('discovery')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                stage === 'discovery'
                  ? 'text-[var(--vpl-accent)] border-b border-[var(--vpl-accent)]'
                  : 'text-[var(--vpl-text-body)] hover:text-[var(--vpl-text)]'
              }`}
            >
              {dict.nav.discovery}
            </button>
            <button
              type="button"
              onClick={() => setStage('lab')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                stage === 'lab'
                  ? 'text-[var(--vpl-accent)] border-b border-[var(--vpl-accent)]'
                  : 'text-[var(--vpl-text-body)] hover:text-[var(--vpl-text)]'
              }`}
            >
              {dict.nav.lab}
            </button>
            <button
              type="button"
              onClick={() => {
                if (activePassport) {
                  setStage('reveal');
                } else if (balance.totalDrops > 0) {
                  void handleReveal();
                }
              }}
              disabled={!activePassport && balance.totalDrops === 0}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                stage === 'reveal'
                  ? 'text-[var(--vpl-accent)] border-b border-[var(--vpl-accent)]'
                  : 'text-[var(--vpl-text-body)] hover:text-[var(--vpl-text)]'
              }`}
            >
              {dict.nav.reveal}
            </button>
          </nav>

          {/* Zone 3: Language Switcher, Theme Mode Selector & Saved Library */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* EN / FA Language Selector */}
            <div
              role="group"
              aria-label={dict.controls.languageLabel}
              className="inline-flex items-center rounded-lg border border-[var(--vpl-border)] bg-[var(--vpl-bg-card)] p-0.5"
            >
              <button
                type="button"
                onClick={() => setLocale('en')}
                aria-pressed={locale === 'en'}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  locale === 'en'
                    ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                    : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                }`}
              >
                {dict.controls.switchToEn}
              </button>
              <button
                type="button"
                onClick={() => setLocale('fa')}
                aria-pressed={locale === 'fa'}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  locale === 'fa'
                    ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                    : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                }`}
              >
                {dict.controls.switchToFa}
              </button>
            </div>

            {/* Dark / Light / System Selector */}
            <div
              role="group"
              aria-label={dict.controls.themeLabel}
              className="inline-flex items-center rounded-lg border border-[var(--vpl-border)] bg-[var(--vpl-bg-card)] p-0.5"
            >
              {themeOptions.map(({ id, label, Icon }) => {
                const active = themePreference === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemePreference(id)}
                    aria-pressed={active}
                    aria-label={label}
                    title={label}
                    className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                        : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden xl:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Saved Library Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg border border-[var(--vpl-border-gold)] bg-[var(--vpl-bg-card)] text-[11px] sm:text-xs font-medium text-[var(--vpl-text)] hover:border-[var(--vpl-accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              <span className="hidden sm:inline">
                {t('nav.savedLibrary', { count: formatNumber(libraryItems.length) })}
              </span>
              <span className="sm:hidden">
                {t('nav.savedShort', { count: formatNumber(libraryItems.length) })}
              </span>
            </button>
          </div>
        </div>

        {/* Compact mobile/tablet stage nav row */}
        <nav
          className="lg:hidden border-t border-[var(--vpl-border-subtle)] px-4 h-10 flex items-center justify-around text-xs font-medium"
          aria-label={dict.nav.mobileAria}
        >
          <button
            type="button"
            onClick={() => setStage('discovery')}
            className={`whitespace-nowrap cursor-pointer ${
              stage === 'discovery'
                ? 'text-[var(--vpl-accent)] font-semibold'
                : 'text-[var(--vpl-text-muted)]'
            }`}
          >
            {dict.nav.discoveryShort}
          </button>
          <button
            type="button"
            onClick={() => setStage('lab')}
            className={`whitespace-nowrap cursor-pointer ${
              stage === 'lab'
                ? 'text-[var(--vpl-accent)] font-semibold'
                : 'text-[var(--vpl-text-muted)]'
            }`}
          >
            {dict.nav.lab}
          </button>
          <button
            type="button"
            onClick={() => {
              if (activePassport) setStage('reveal');
              else if (balance.totalDrops > 0) void handleReveal();
            }}
            disabled={!activePassport && balance.totalDrops === 0}
            className={`whitespace-nowrap cursor-pointer disabled:opacity-40 ${
              stage === 'reveal'
                ? 'text-[var(--vpl-accent)] font-semibold'
                : 'text-[var(--vpl-text-muted)]'
            }`}
          >
            {dict.nav.revealShort}
          </button>
        </nav>
      </header>

      <main className="flex-1">
        {stage === 'discovery' && (
          <DiscoveryFlow
            referenceCount={catalogStats?.totalPerfumes}
            onApplyProfileAndEnter={handleApplyProfileAndEnter}
            onEnterLabDirect={handleEnterLabDirect}
            onLoadPreset={handleLoadPreset}
          />
        )}

        {stage === 'lab' && (
          <ApothecaryLab
            selection={selection}
            entries={entries}
            balance={balance}
            scentProfile={scentProfile}
            canUndo={history.length > 0}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onAdjustNote={handleAdjustNote}
            onRemoveNote={handleRemoveNote}
            onUndo={handleUndo}
            onReset={handleReset}
            onLoadPreset={handleLoadPreset}
            onReveal={() => void handleReveal()}
          />
        )}

        {stage === 'reveal' && activePassport && (
          <RevealAndPassport
            passport={activePassport}
            isDistilling={isDistilling}
            isCritiqueLoading={isCritiqueLoading}
            critiqueNotice={critiqueNotice}
            matchError={matchError}
            isSaved={isCurrentSaved}
            onUpdateTitle={(title) =>
              setActivePassport((p) => (p ? { ...p, fragranceName: title } : p))
            }
            onUpdateAlchemist={(name) =>
              setActivePassport((p) => (p ? { ...p, alchemistName: name } : p))
            }
            onRegenerateCritique={() => void fetchOptionalAiCritique(activePassport, true)}
            onRetryMatch={() => void handleReveal()}
            onSaveToLibrary={handleSaveToLibrary}
            onReturnToLab={() => {
              setStage('lab');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        )}
      </main>

      <footer className="border-t border-[var(--vpl-border)] py-7 px-4 sm:px-6 lg:px-8 text-xs text-[var(--vpl-text-subtle)]">
        <div className="mx-auto max-w-[1360px] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`shrink-0 ${
                isLight
                  ? 'rounded-lg px-2.5 py-1.5 bg-[#14110D] border border-[var(--vpl-border-gold)]'
                  : ''
              }`}
            >
              <img
                src="/virtual_perfume_lab_logo_transparent.png"
                alt={dict.brand.logoAlt}
                className="h-14 w-auto object-contain shrink-0"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[var(--vpl-text-body)] font-medium">
                {dict.footer.studioTagline}
              </div>
              <div>
                {dict.footer.attributionPrefix}{' '}
                <a
                  href="https://www.scento.com/perfume-database"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--vpl-accent)] hover:underline"
                >
                  <span dir="ltr">Scento — scento.com/perfume-database</span>
                </a>{' '}
                {dict.footer.attributionLicense}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="max-w-md leading-relaxed">{dict.footer.disclaimer}</span>
            <button
              type="button"
              onClick={() => setIsAdminCatalogOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-[var(--vpl-border-gold)] bg-[var(--vpl-bg-card)] text-xs font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] hover:text-[var(--vpl-text)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t('footer.catalogButton', {
                count: formatNumber(catalogStats?.totalPerfumes ?? 1479),
              })}
            </button>
          </div>
        </div>
      </footer>

      <LibraryDrawerOrModal
        isOpen={isLibraryOpen}
        items={libraryItems}
        onClose={() => setIsLibraryOpen(false)}
        onLoadInLab={handleLoadFromLibrary}
        onOpenPassport={handleOpenPassportFromLibrary}
        onDuplicate={handleDuplicateFromLibrary}
        onDelete={handleDeleteFromLibrary}
      />

      <AdminCatalogModal
        isOpen={isAdminCatalogOpen}
        onClose={() => setIsAdminCatalogOpen(false)}
        onCatalogUpdated={() => void fetchCatalogSummary()}
      />
    </div>
  );
}

