import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ATELIER_PRESETS, FRAGRANCE_NOTES, OLFACTORY_FAMILIES } from '../data/catalog';
import { useI18n } from '../i18n/I18nContext';
import type {
  AtelierPreset,
  BalanceReport,
  BlendSelection,
  NormalizedNoteEntry,
  NoteLayer,
  OlfactoryFamily,
  ScentProfile,
} from '../types/fragrance';
import { PerfumeVessel } from './PerfumeVessel';

interface ApothecaryLabProps {
  selection: BlendSelection;
  entries: NormalizedNoteEntry[];
  balance: BalanceReport;
  scentProfile: ScentProfile | null;
  canUndo: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAdjustNote: (noteId: string, delta: number) => void;
  onRemoveNote: (noteId: string) => void;
  onUndo: () => void;
  onReset: () => void;
  onLoadPreset: (preset: AtelierPreset) => void;
  onReveal: () => void;
}

export const ApothecaryLab: React.FC<ApothecaryLabProps> = ({
  selection,
  entries,
  balance,
  scentProfile,
  canUndo,
  soundEnabled,
  onToggleSound,
  onAdjustNote,
  onRemoveNote,
  onUndo,
  onReset,
  onLoadPreset,
  onReveal,
}) => {
  const {
    dict,
    t,
    formatNumber,
    getNoteCopy,
    getPresetCopy,
    getFamilyLabel,
    getLayerLabel,
    getDiagnosticCopy,
    getBalanceSummaryCopy,
    getProfileCopy,
  } = useI18n();

  const [layerFilter, setLayerFilter] = useState<'all' | NoteLayer>('all');
  const [familyFilter, setFamilyFilter] = useState<'all' | OlfactoryFamily>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const recommendedSet = useMemo(
    () => new Set(scentProfile?.recommendedNoteIds ?? []),
    [scentProfile]
  );

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FRAGRANCE_NOTES.filter((note) => {
      if (layerFilter !== 'all' && note.layer !== layerFilter) return false;
      if (familyFilter !== 'all' && note.family !== familyFilter) return false;
      if (q) {
        const noteCopy = getNoteCopy(note);
        const localizedFamily = getFamilyLabel(note.family);
        const hay = `${note.name} ${note.family} ${note.origin} ${note.accords.join(' ')} ${note.description} ${noteCopy.name} ${localizedFamily} ${noteCopy.origin} ${noteCopy.accords.join(' ')} ${noteCopy.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [layerFilter, familyFilter, searchQuery, getNoteCopy, getFamilyLabel]);

  const statusTone =
    balance.overallStatus === 'balanced'
      ? {
          glyph: '●',
          label: dict.lab.statusBalanced,
          cls: 'text-[var(--vpl-success)]',
        }
      : balance.overallStatus === 'advisory'
      ? {
          glyph: '▲',
          label: dict.lab.statusAdvisory,
          cls: 'text-[var(--vpl-accent)]',
        }
      : {
          glyph: '✖',
          label: dict.lab.statusImbalanced,
          cls: 'text-[var(--vpl-danger)]',
        };

  const facetBars: { label: string; value: number }[] = [
    { label: dict.lab.facets.warmth, value: balance.facets.warmth },
    { label: dict.lab.facets.freshness, value: balance.facets.freshness },
    { label: dict.lab.facets.sweetness, value: balance.facets.sweetness },
    { label: dict.lab.facets.dryness, value: balance.facets.dryness },
    { label: dict.lab.facets.smokiness, value: balance.facets.smokiness },
    { label: dict.lab.facets.floralcy, value: balance.facets.floralcy },
  ];

  const profileCopy = useMemo(
    () => (scentProfile ? getProfileCopy(scentProfile) : null),
    [scentProfile, getProfileCopy]
  );

  return (
    <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Lab Workspace Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-[var(--vpl-border)]">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
            {dict.lab.eyebrow}
            {profileCopy ? ` · ${t('lab.profilePrefix', { label: profileCopy.label })}` : ''}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--vpl-text)] mt-0.5">
            {dict.lab.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor="preset-select" className="sr-only">
              {dict.lab.presetLabel}
            </label>
            <select
              id="preset-select"
              value=""
              onChange={(e) => {
                const found = ATELIER_PRESETS.find((p) => p.id === e.target.value);
                if (found) onLoadPreset(found);
              }}
              className="px-3 py-2 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-strong)] text-xs font-medium text-[var(--vpl-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer"
            >
              <option value="" disabled>
                {dict.lab.presetPlaceholder}
              </option>
              {ATELIER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {getPresetCopy(p.id).name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--vpl-border-strong)] text-xs font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
            <span>{dict.lab.undo}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={balance.totalDrops === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--vpl-border-strong)] text-xs font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-danger-border)] hover:text-[var(--vpl-danger)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{dict.lab.reset}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? dict.lab.audioMuteAria : dict.lab.audioEnableAria}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              soundEnabled
                ? 'bg-[var(--vpl-accent-soft)] border-[var(--vpl-border-gold)] text-[var(--vpl-text)]'
                : 'border-[var(--vpl-border-strong)] text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[var(--vpl-accent)]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{soundEnabled ? dict.lab.audioOn : dict.lab.audioOff}</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Vessel Summary */}
      <div className="lg:hidden mb-5 p-4 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-gold)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase text-[var(--vpl-accent)] tabular-nums">
            {formatNumber(balance.totalDrops)}{' '}
            {balance.totalDrops === 1 ? dict.lab.dropSingular : dict.lab.dropPlural} ·{' '}
            {formatNumber(balance.noteCount)}{' '}
            {balance.noteCount === 1 ? dict.lab.noteSingular : dict.lab.notePlural}
          </div>
          <div className="text-xs font-mono text-[var(--vpl-text-body)] truncate mt-0.5 tabular-nums">
            {getLayerLabel('top')} {formatNumber(balance.pyramid.top)}% · {getLayerLabel('heart')}{' '}
            {formatNumber(balance.pyramid.heart)}% · {getLayerLabel('base')}{' '}
            {formatNumber(balance.pyramid.base)}%
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              document.getElementById('lab-vessel-panel')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="px-2.5 py-2 rounded-lg border border-[var(--vpl-border-strong)] text-[11px] font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] whitespace-nowrap cursor-pointer"
          >
            {dict.lab.jumpToVessel}
          </button>
          <button
            type="button"
            onClick={onReveal}
            disabled={balance.totalDrops === 0}
            className="px-3.5 py-2 rounded-lg bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            {dict.lab.mobileReveal}
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Botanical & Molecule Catalog */}
        <section className="lg:col-span-7 space-y-5" aria-label={dict.lab.title}>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="note-search" className="sr-only">
                {dict.lab.searchAria}
              </label>
              <Search
                className="w-4 h-4 text-[var(--vpl-text-muted)] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="note-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.lab.searchPlaceholder}
                className="w-full ps-10 pe-4 py-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] text-sm text-[var(--vpl-text)] placeholder:text-[var(--vpl-text-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
              />
            </div>

            <div className="shrink-0">
              <label htmlFor="family-filter" className="sr-only">
                {dict.lab.familyFilterAria}
              </label>
              <select
                id="family-filter"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value as 'all' | OlfactoryFamily)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] text-sm text-[var(--vpl-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer"
              >
                <option value="all">{dict.lab.allFamilies}</option>
                {OLFACTORY_FAMILIES.map((fam) => (
                  <option key={fam} value={fam}>
                    {getFamilyLabel(fam)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Layer Segmented Filter */}
          <div
            className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]"
            role="tablist"
            aria-label={dict.lab.layerFilterAria}
          >
            {(
              [
                {
                  id: 'all',
                  shortLabel: dict.lab.layers.allShort,
                  fullLabel: dict.lab.layers.allFull,
                },
                {
                  id: 'top',
                  shortLabel: dict.lab.layers.topShort,
                  fullLabel: dict.lab.layers.topFull,
                },
                {
                  id: 'heart',
                  shortLabel: dict.lab.layers.heartShort,
                  fullLabel: dict.lab.layers.heartFull,
                },
                {
                  id: 'base',
                  shortLabel: dict.lab.layers.baseShort,
                  fullLabel: dict.lab.layers.baseFull,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={layerFilter === tab.id}
                onClick={() => setLayerFilter(tab.id)}
                className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  layerFilter === tab.id
                    ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                    : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </button>
            ))}
          </div>

          {/* Note Grid */}
          {filteredNotes.length === 0 ? (
            <div className="p-10 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] text-center">
              <p className="text-sm text-[var(--vpl-text-body)]">{dict.lab.emptyFilter}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLayerFilter('all');
                  setFamilyFilter('all');
                }}
                className="mt-3 text-xs font-medium text-[var(--vpl-accent)] hover:underline cursor-pointer"
              >
                {dict.lab.clearFilters}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredNotes.map((note) => {
                const noteCopy = getNoteCopy(note);
                const drops = selection[note.id] ?? 0;
                const isRecommended = recommendedSet.has(note.id);
                const share =
                  balance.totalDrops > 0 && drops > 0
                    ? formatNumber((drops / balance.totalDrops) * 100, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })
                    : null;

                return (
                  <article
                    key={note.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                      drops > 0
                        ? 'bg-[var(--vpl-bg-card-active)] border-[var(--vpl-border-gold)]'
                        : 'bg-[var(--vpl-bg-card)] border-[var(--vpl-border)] hover:border-[var(--vpl-border-strong)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--vpl-text-muted)] mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: note.colorHex }}
                            aria-hidden="true"
                          />
                          <span className="uppercase">{getLayerLabel(note.layer)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{getFamilyLabel(note.family)}</span>
                        </div>
                        {isRecommended && (
                          <span className="text-[var(--vpl-accent)] shrink-0">
                            {dict.lab.profileMatch}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)] leading-snug">
                          {noteCopy.name}
                        </h2>
                        {share && (
                          <span className="font-mono text-xs text-[var(--vpl-accent)] tabular-nums shrink-0">
                            {share}%
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--vpl-text-body)] mt-1.5 leading-relaxed">
                        {noteCopy.description}
                      </p>

                      <div className="text-[11px] text-[var(--vpl-text-subtle)] mt-2 truncate">
                        {noteCopy.accords.join(' · ')}
                      </div>
                    </div>

                    {/* Drop Controls */}
                    <div className="mt-4 pt-3 border-t border-[var(--vpl-border-subtle)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAdjustNote(note.id, -1)}
                          disabled={drops === 0}
                          aria-label={t('lab.removeDropAria', { name: noteCopy.name })}
                          className="w-9 h-9 rounded-md border border-[var(--vpl-border-strong)] flex items-center justify-center text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>

                        <span
                          className="w-9 text-center font-mono text-sm font-semibold text-[var(--vpl-text)] tabular-nums"
                          aria-label={t('lab.dropsUnitLabel', { name: noteCopy.name })}
                        >
                          {formatNumber(drops)}
                        </span>

                        <button
                          type="button"
                          onClick={() => onAdjustNote(note.id, 1)}
                          aria-label={t('lab.addDropAria', { name: noteCopy.name })}
                          className="w-9 h-9 rounded-md bg-[var(--vpl-accent-soft)] border border-[var(--vpl-border-gold)] flex items-center justify-center text-[var(--vpl-text)] hover:bg-[var(--vpl-accent)] hover:text-[var(--vpl-accent-text-on-fill)] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdjustNote(note.id, 3)}
                        aria-label={t('lab.addThreeDropsAria', { name: noteCopy.name })}
                        className="px-2.5 py-2 rounded-md border border-[var(--vpl-border)] text-xs font-mono text-[var(--vpl-text-body)] hover:border-[var(--vpl-border-gold)] hover:text-[var(--vpl-text)] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {dict.lab.addThreeDropsLabel}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Vessel, Normalized Shares, Balance Engine & Reveal */}
        <aside id="lab-vessel-panel" className="lg:col-span-5 space-y-5 lg:sticky lg:top-6" aria-label={dict.lab.diagnosticsTitle}>
          <PerfumeVessel balance={balance} entries={entries} />

          {/* Normalized Blend Proportions */}
          <div className="p-5 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
                {dict.lab.normalizedTitle}
              </h2>
              <span className="font-mono text-xs text-[var(--vpl-accent)] tabular-nums">
                {balance.totalDrops > 0
                  ? t('lab.totalPercent', { value: formatNumber(100) })
                  : dict.lab.zeroPercent}
              </span>
            </div>

            <p className="text-xs text-[var(--vpl-text-muted)] leading-relaxed">
              {dict.lab.normalizedDisclaimer}
            </p>

            {/* Pyramid Ratio Bar */}
            <div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-[var(--vpl-bg-bar-track)] flex">
                {balance.totalDrops > 0 && (
                  <>
                    <div
                      style={{ width: `${balance.pyramid.top}%` }}
                      className="bg-[#E8C967] h-full transition-all duration-300"
                      title={`${getLayerLabel('top')} ${formatNumber(balance.pyramid.top)}%`}
                    />
                    <div
                      style={{ width: `${balance.pyramid.heart}%` }}
                      className="bg-[#C86472] h-full transition-all duration-300"
                      title={`${getLayerLabel('heart')} ${formatNumber(balance.pyramid.heart)}%`}
                    />
                    <div
                      style={{ width: `${balance.pyramid.base}%` }}
                      className="bg-[#9C734B] h-full transition-all duration-300"
                      title={`${getLayerLabel('base')} ${formatNumber(balance.pyramid.base)}%`}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--vpl-text-muted)] mt-2 tabular-nums">
                <span>
                  {getLayerLabel('top')} {formatNumber(balance.pyramid.top)}%
                </span>
                <span>
                  {getLayerLabel('heart')} {formatNumber(balance.pyramid.heart)}%
                </span>
                <span>
                  {getLayerLabel('base')} {formatNumber(balance.pyramid.base)}%
                </span>
              </div>
            </div>

            {/* Active Notes List */}
            {entries.length === 0 ? (
              <div className="py-6 text-center border-t border-[var(--vpl-border)] text-xs text-[var(--vpl-text-muted)]">
                {dict.lab.emptyVesselPrompt}
              </div>
            ) : (
              <div className="divide-y divide-[var(--vpl-border-subtle)] border-t border-[var(--vpl-border)] max-h-80 overflow-y-auto pe-1">
                {entries.map((entry) => {
                  const noteCopy = getNoteCopy(entry.note);
                  return (
                    <div
                      key={entry.note.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--vpl-text)] truncate">
                          {noteCopy.name}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--vpl-text-muted)] uppercase">
                          {getLayerLabel(entry.note.layer)} · {formatNumber(entry.drops)}{' '}
                          {entry.drops === 1 ? dict.lab.dropSingular : dict.lab.dropPlural}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold text-[var(--vpl-accent)] tabular-nums w-12 text-end">
                          {formatNumber(entry.percentage, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          %
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveNote(entry.note.id)}
                          aria-label={t('lab.removeNoteAria', { name: noteCopy.name })}
                          className="p-1.5 rounded text-[var(--vpl-text-subtle)] hover:text-[var(--vpl-danger)] hover:bg-[var(--vpl-danger-bg)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deterministic Balancing Engine */}
          <div className="p-5 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
                {dict.lab.diagnosticsTitle}
              </h2>
              <span className={`font-mono text-xs font-medium ${statusTone.cls}`}>
                {statusTone.glyph} {statusTone.label}
              </span>
            </div>

            <p className="text-xs text-[var(--vpl-text-body)] leading-relaxed">
              {getBalanceSummaryCopy(balance)}
            </p>

            {/* Facet Bars */}
            {balance.totalDrops > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-2 border-t border-[var(--vpl-border)]">
                {facetBars.map((f) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-[11px] font-mono text-[var(--vpl-text-muted)] mb-1 tabular-nums">
                      <span>{f.label}</span>
                      <span>{formatNumber(f.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--vpl-bg-bar-track)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--vpl-accent)] transition-all duration-300"
                        style={{ width: `${f.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actionable Diagnostics */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--vpl-border)]">
              {balance.diagnostics.map((diag) => {
                const diagCopy = getDiagnosticCopy(diag, balance);
                return (
                  <div key={diag.id} className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-[var(--vpl-text)]">
                      {diag.severity === 'balanced' ? (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-[var(--vpl-success)] shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-[var(--vpl-accent)] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>{diagCopy.title}</span>
                    </div>
                    <p className="text-[var(--vpl-text-muted)] leading-relaxed ps-5">
                      {diagCopy.suggestion}
                    </p>
                    {diag.targetLayer && (
                      <div className="ps-5">
                        <button
                          type="button"
                          onClick={() => setLayerFilter(diag.targetLayer!)}
                          className="text-[11px] font-mono text-[var(--vpl-accent)] hover:underline cursor-pointer"
                        >
                          {t('lab.browseLayerNotes', {
                            layer: getLayerLabel(diag.targetLayer),
                          })}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Reveal CTA */}
          <button
            type="button"
            onClick={onReveal}
            disabled={balance.totalDrops === 0}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-sm font-semibold hover:bg-[var(--vpl-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            <span>{dict.lab.revealCta}</span>
          </button>
        </aside>
      </div>
    </div>
  );
};

