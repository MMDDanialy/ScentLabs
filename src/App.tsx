import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApothecaryLab } from './components/ApothecaryLab';
import { DiscoveryFlow } from './components/DiscoveryFlow';
import { LibraryDrawerOrModal } from './components/LibraryDrawerOrModal';
import { RevealAndPassport } from './components/RevealAndPassport';
import { FRAGRANCE_NOTES, REFERENCE_PERFUMES } from './data/catalog';
import {
  computeBalanceReport,
  computeSimilarityMatches,
  deriveMoodAndSeasons,
  generateDeterministicCritique,
  generateFormulaCode,
  normalizeBlend,
} from './engine/formulationEngine';
import { atelierAudio } from './services/audioAndExport';
import type {
  AppStage,
  AtelierPreset,
  BlendSelection,
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

  const [libraryItems, setLibraryItems] = useState<PassportData[]>(() => loadSavedLibrary());
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

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

  const handleLoadPreset = useCallback((preset: AtelierPreset) => {
    setHistory((h) => [...h.slice(-24), selection]);
    setSelection({ ...preset.selection });
    setStage('lab');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selection]);

  const fetchOptionalAiCritique = useCallback(
    async (passport: PassportData, isManualRefresh = false) => {
      setIsCritiqueLoading(true);
      setCritiqueNotice(null);
      try {
        const res = await fetch('/api/critique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
                  sharedNotes: passport.topMatches[0].sharedNotes,
                  sharedAccords: passport.topMatches[0].sharedAccords,
                  keyDifferences: passport.topMatches[0].keyDifferences,
                }
              : null,
          }),
        });

        if (!res.ok) {
          if (isManualRefresh) {
            setCritiqueNotice(
              'AI editorial service is temporarily unavailable; displaying deterministic atelier analysis.'
            );
          }
          return;
        }

        const data = (await res.json()) as { critique?: string; source?: 'ai' };
        if (data.critique) {
          setActivePassport((current) =>
            current && current.id === passport.id
              ? { ...current, editorialCritique: data.critique!, critiqueSource: 'ai' }
              : current
          );
        }
      } catch {
        if (isManualRefresh) {
          setCritiqueNotice(
            'Could not reach editorial critique endpoint; displaying deterministic atelier analysis.'
          );
        }
      } finally {
        setIsCritiqueLoading(false);
      }
    },
    []
  );

  const handleReveal = useCallback(() => {
    if (balance.totalDrops === 0) return;

    const topMatches = computeSimilarityMatches(selection, FRAGRANCE_NOTES, REFERENCE_PERFUMES);
    const { moodTags, seasonTags } = deriveMoodAndSeasons(balance);
    const formulaCode = generateFormulaCode(entries);

    const leadNote = [...entries].sort((a, b) => b.percentage - a.percentage)[0]?.note.name;
    const defaultTitle =
      balance.dominantFamily && leadNote
        ? `Nocturne ${leadNote.split(' ').pop()}`
        : 'Atelier Composition';

    const deterministicCritique = generateDeterministicCritique(
      defaultTitle,
      entries,
      balance,
      topMatches[0] ?? null
    );

    const newPassport: PassportData = {
      id: `${formulaCode}-${Date.now()}`,
      formulaCode,
      fragranceName: defaultTitle,
      alchemistName: 'Atelier Guest',
      createdAt: new Date().toISOString(),
      totalDrops: balance.totalDrops,
      entries,
      balance,
      topMatches,
      moodTags,
      seasonTags,
      editorialCritique: deterministicCritique,
      critiqueSource: 'deterministic',
    };

    setActivePassport(newPassport);
    setCritiqueNotice(null);
    setStage('reveal');
    window.scrollTo({ top: 0, behavior: 'instant' });
    atelierAudio.playRevealChord();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setIsDistilling(true);
    setTimeout(
      () => {
        setIsDistilling(false);
      },
      prefersReducedMotion ? 120 : 900
    );

    void fetchOptionalAiCritique(newPassport);
  }, [balance, entries, selection, fetchOptionalAiCritique]);

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
    setIsDistilling(false);
    setIsLibraryOpen(false);
    setStage('reveal');
  }, []);

  const handleDeleteFromLibrary = useCallback((id: string) => {
    setLibraryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isCurrentSaved = Boolean(
    activePassport && libraryItems.some((item) => item.id === activePassport.id)
  );

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F4EFE6] flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-[#D4AF6E]/15 bg-[#0A0908]/95 sticky top-0 z-40 backdrop-blur-xs">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => setStage('discovery')}
            className="font-serif text-lg sm:text-2xl font-semibold tracking-tight text-[#F4EFE6] whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            Virtual Perfume Lab
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Primary stages">
            <button
              type="button"
              onClick={() => setStage('discovery')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                stage === 'discovery'
                  ? 'text-[#D4AF6E] border-b border-[#D4AF6E]'
                  : 'text-[#B9B0A2] hover:text-[#F4EFE6]'
              }`}
            >
              Scent Discovery
            </button>
            <button
              type="button"
              onClick={() => setStage('lab')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                stage === 'lab'
                  ? 'text-[#D4AF6E] border-b border-[#D4AF6E]'
                  : 'text-[#B9B0A2] hover:text-[#F4EFE6]'
              }`}
            >
              Laboratory
            </button>
            <button
              type="button"
              onClick={() => {
                if (activePassport) {
                  setStage('reveal');
                } else if (balance.totalDrops > 0) {
                  handleReveal();
                }
              }}
              disabled={!activePassport && balance.totalDrops === 0}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                stage === 'reveal'
                  ? 'text-[#D4AF6E] border-b border-[#D4AF6E]'
                  : 'text-[#B9B0A2] hover:text-[#F4EFE6]'
              }`}
            >
              Reveal & Passport
            </button>
          </nav>

          {/* Zone 3: Single primary header action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="px-4 py-2 rounded-lg border border-[#D4AF6E]/35 bg-[#141210] text-xs font-medium text-[#F4EFE6] hover:border-[#D4AF6E] transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              Saved Library · {libraryItems.length}
            </button>
          </div>
        </div>

        {/* Compact mobile stage nav row */}
        <nav
          className="md:hidden border-t border-white/8 px-4 h-10 flex items-center justify-around text-xs font-medium"
          aria-label="Mobile stages"
        >
          <button
            type="button"
            onClick={() => setStage('discovery')}
            className={`whitespace-nowrap cursor-pointer ${
              stage === 'discovery' ? 'text-[#D4AF6E]' : 'text-[#A89F91]'
            }`}
          >
            Discovery
          </button>
          <button
            type="button"
            onClick={() => setStage('lab')}
            className={`whitespace-nowrap cursor-pointer ${
              stage === 'lab' ? 'text-[#D4AF6E]' : 'text-[#A89F91]'
            }`}
          >
            Laboratory
          </button>
          <button
            type="button"
            onClick={() => {
              if (activePassport) setStage('reveal');
              else if (balance.totalDrops > 0) handleReveal();
            }}
            disabled={!activePassport && balance.totalDrops === 0}
            className={`whitespace-nowrap cursor-pointer disabled:opacity-40 ${
              stage === 'reveal' ? 'text-[#D4AF6E]' : 'text-[#A89F91]'
            }`}
          >
            Passport
          </button>
        </nav>
      </header>

      <main className="flex-1">
        {stage === 'discovery' && (
          <DiscoveryFlow
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
            onReveal={handleReveal}
          />
        )}

        {stage === 'reveal' && activePassport && (
          <RevealAndPassport
            passport={activePassport}
            isDistilling={isDistilling}
            isCritiqueLoading={isCritiqueLoading}
            critiqueNotice={critiqueNotice}
            isSaved={isCurrentSaved}
            onUpdateTitle={(title) =>
              setActivePassport((p) => (p ? { ...p, fragranceName: title } : p))
            }
            onUpdateAlchemist={(name) =>
              setActivePassport((p) => (p ? { ...p, alchemistName: name } : p))
            }
            onRegenerateCritique={() => void fetchOptionalAiCritique(activePassport, true)}
            onSaveToLibrary={handleSaveToLibrary}
            onReturnToLab={() => {
              setStage('lab');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        )}
      </main>

      <footer className="border-t border-white/10 py-6 px-4 sm:px-6 lg:px-8 text-xs text-[#8E8477]">
        <div className="mx-auto max-w-[1360px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>Virtual Perfume Lab · Creative Olfactory Studio</span>
          <span>
            Proportions represent virtual creative shares; similarity scores are internal
            algorithmic estimates, not chemical tests or brand endorsements.
          </span>
        </div>
      </footer>

      <LibraryDrawerOrModal
        isOpen={isLibraryOpen}
        items={libraryItems}
        onClose={() => setIsLibraryOpen(false)}
        onLoadInLab={handleLoadFromLibrary}
        onOpenPassport={handleOpenPassportFromLibrary}
        onDelete={handleDeleteFromLibrary}
      />
    </div>
  );
}
