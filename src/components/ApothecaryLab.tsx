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

const LAYER_LABELS: Record<NoteLayer, string> = {
  top: 'Top',
  heart: 'Heart',
  base: 'Base',
};

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
        const hay = `${note.name} ${note.family} ${note.origin} ${note.accords.join(' ')} ${note.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [layerFilter, familyFilter, searchQuery]);

  const statusTone =
    balance.overallStatus === 'balanced'
      ? { glyph: '●', label: 'Balanced', cls: 'text-emerald-400' }
      : balance.overallStatus === 'advisory'
      ? { glyph: '▲', label: 'Advisory', cls: 'text-[#D4AF6E]' }
      : { glyph: '✖', label: 'Skewed', cls: 'text-rose-400' };

  const facetBars: { label: string; value: number }[] = [
    { label: 'Warmth', value: balance.facets.warmth },
    { label: 'Freshness', value: balance.facets.freshness },
    { label: 'Sweetness', value: balance.facets.sweetness },
    { label: 'Dryness', value: balance.facets.dryness },
    { label: 'Smokiness', value: balance.facets.smokiness },
    { label: 'Floralcy', value: balance.facets.floralcy },
  ];

  return (
    <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Lab Workspace Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
            Formulation Workbench
            {scentProfile ? ` · Profile: ${scentProfile.label}` : ''}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#F4EFE6] mt-0.5">
            Virtual Perfume Laboratory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor="preset-select" className="sr-only">
              Load starter accord
            </label>
            <select
              id="preset-select"
              value=""
              onChange={(e) => {
                const found = ATELIER_PRESETS.find((p) => p.id === e.target.value);
                if (found) onLoadPreset(found);
              }}
              className="px-3 py-2 rounded-lg bg-[#161412] border border-white/15 text-xs font-medium text-[#E5DDD0] focus-visible:outline-2 focus-visible:outline-[#D4AF6E] cursor-pointer"
            >
              <option value="" disabled>
                Load starter accord...
              </option>
              {ATELIER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#E5DDD0] hover:border-[#D4AF6E]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={balance.totalDrops === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#E5DDD0] hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute laboratory audio' : 'Enable subtle drop audio'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              soundEnabled
                ? 'bg-[#D4AF6E]/15 border-[#D4AF6E]/60 text-[#F4EFE6]'
                : 'border-white/15 text-[#A89F91] hover:text-[#F4EFE6]'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#D4AF6E]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{soundEnabled ? 'Audio On' : 'Audio Off'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Vessel Summary (non-sticky, above catalog) */}
      <div className="lg:hidden mb-5 p-4 rounded-xl bg-[#13110F] border border-[#D4AF6E]/25 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase text-[#D4AF6E] tabular-nums">
            {balance.totalDrops} {balance.totalDrops === 1 ? 'drop' : 'drops'} · {balance.noteCount}{' '}
            {balance.noteCount === 1 ? 'note' : 'notes'}
          </div>
          <div className="text-xs font-mono text-[#C7BEB0] truncate mt-0.5 tabular-nums">
            Top {balance.pyramid.top}% · Heart {balance.pyramid.heart}% · Base {balance.pyramid.base}%
          </div>
        </div>
        <button
          type="button"
          onClick={onReveal}
          disabled={balance.totalDrops === 0}
          className="px-4 py-2 rounded-lg bg-[#D4AF6E] text-[#0A0908] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
        >
          Reveal Blend
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Botanical & Molecule Catalog */}
        <section className="lg:col-span-7 space-y-5" aria-label="Fragrance materials catalog">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="note-search" className="sr-only">
                Search fragrance notes by name, accord, or origin
              </label>
              <Search
                className="w-4 h-4 text-[#9C9283] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="note-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bergamot, rose, sandalwood, smoky..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#141210] border border-white/12 text-sm text-[#F4EFE6] placeholder:text-[#7E7568] focus-visible:outline-2 focus-visible:outline-[#D4AF6E]"
              />
            </div>

            <div className="shrink-0">
              <label htmlFor="family-filter" className="sr-only">
                Filter by olfactory family
              </label>
              <select
                id="family-filter"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value as 'all' | OlfactoryFamily)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg bg-[#141210] border border-white/12 text-sm text-[#E5DDD0] focus-visible:outline-2 focus-visible:outline-[#D4AF6E] cursor-pointer"
              >
                <option value="all">All Families</option>
                {OLFACTORY_FAMILIES.map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Layer Segmented Filter */}
          <div
            className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#13110F] border border-white/10"
            role="tablist"
            aria-label="Filter notes by pyramid layer"
          >
            {(
              [
                { id: 'all', shortLabel: 'All', fullLabel: 'All Layers' },
                { id: 'top', shortLabel: 'Top', fullLabel: 'Top Notes' },
                { id: 'heart', shortLabel: 'Heart', fullLabel: 'Heart Notes' },
                { id: 'base', shortLabel: 'Base', fullLabel: 'Base Notes' },
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
                    ? 'bg-[#D4AF6E] text-[#0A0908] font-semibold'
                    : 'text-[#A89F91] hover:text-[#F4EFE6]'
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </button>
            ))}
          </div>

          {/* Note Grid */}
          {filteredNotes.length === 0 ? (
            <div className="p-10 rounded-xl bg-[#13110F] border border-white/10 text-center">
              <p className="text-sm text-[#C7BEB0]">
                No notes match your current search or layer filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLayerFilter('all');
                  setFamilyFilter('all');
                }}
                className="mt-3 text-xs font-medium text-[#D4AF6E] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredNotes.map((note) => {
                const drops = selection[note.id] ?? 0;
                const isRecommended = recommendedSet.has(note.id);
                const share =
                  balance.totalDrops > 0 && drops > 0
                    ? ((drops / balance.totalDrops) * 100).toFixed(1)
                    : null;

                return (
                  <article
                    key={note.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col justify-between ${
                      drops > 0
                        ? 'bg-[#181512] border-[#D4AF6E]/45'
                        : 'bg-[#13110F] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#9C9283] mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: note.colorHex }}
                            aria-hidden="true"
                          />
                          <span className="uppercase">{LAYER_LABELS[note.layer]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{note.family}</span>
                        </div>
                        {isRecommended && (
                          <span className="text-[#D4AF6E] shrink-0">Profile match</span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-serif text-xl font-semibold text-[#F4EFE6] leading-snug">
                          {note.name}
                        </h2>
                        {share && (
                          <span className="font-mono text-xs text-[#D4AF6E] tabular-nums shrink-0">
                            {share}%
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#B2A899] mt-1.5 leading-relaxed">
                        {note.description}
                      </p>

                      <div className="text-[11px] text-[#8E8477] mt-2 truncate">
                        {note.accords.join(' · ')}
                      </div>
                    </div>

                    {/* Drop Controls */}
                    <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAdjustNote(note.id, -1)}
                          disabled={drops === 0}
                          aria-label={`Remove 1 drop of ${note.name}`}
                          className="w-8 h-8 rounded-md border border-white/15 flex items-center justify-center text-[#E5DDD0] hover:border-[#D4AF6E]/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>

                        <span
                          className="w-10 text-center font-mono text-sm font-semibold text-[#F4EFE6] tabular-nums"
                          aria-label={`${note.name} drops`}
                        >
                          {drops}
                        </span>

                        <button
                          type="button"
                          onClick={() => onAdjustNote(note.id, 1)}
                          aria-label={`Add 1 drop of ${note.name}`}
                          className="w-8 h-8 rounded-md bg-[#D4AF6E]/15 border border-[#D4AF6E]/40 flex items-center justify-center text-[#F4EFE6] hover:bg-[#D4AF6E] hover:text-[#0A0908] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdjustNote(note.id, 3)}
                        aria-label={`Add 3 drops of ${note.name}`}
                        className="px-2.5 py-1.5 rounded-md border border-white/12 text-xs font-mono text-[#C7BEB0] hover:border-[#D4AF6E]/50 hover:text-[#F4EFE6] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        +3 drops
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Vessel, Normalized Shares, Balance Engine & Reveal */}
        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-6" aria-label="Vessel and balance diagnostics">
          <PerfumeVessel balance={balance} entries={entries} />

          {/* Normalized Blend Proportions */}
          <div className="p-5 rounded-xl bg-[#13110F] border border-white/10 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl font-semibold text-[#F4EFE6]">
                Normalized Blend Shares
              </h2>
              <span className="font-mono text-xs text-[#D4AF6E] tabular-nums">
                {balance.totalDrops > 0 ? '100% total' : '0% total'}
              </span>
            </div>

            <p className="text-xs text-[#9C9283] leading-relaxed">
              Virtual creative blend shares (relative proportions, not physical perfumery dilution
              or IFRA chemical formulas).
            </p>

            {/* Pyramid Ratio Bar */}
            <div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#1E1B18] flex">
                {balance.totalDrops > 0 && (
                  <>
                    <div
                      style={{ width: `${balance.pyramid.top}%` }}
                      className="bg-[#E8C967] h-full transition-all duration-300"
                      title={`Top ${balance.pyramid.top}%`}
                    />
                    <div
                      style={{ width: `${balance.pyramid.heart}%` }}
                      className="bg-[#C86472] h-full transition-all duration-300"
                      title={`Heart ${balance.pyramid.heart}%`}
                    />
                    <div
                      style={{ width: `${balance.pyramid.base}%` }}
                      className="bg-[#9C734B] h-full transition-all duration-300"
                      title={`Base ${balance.pyramid.base}%`}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#B9B0A2] mt-2 tabular-nums">
                <span>Top {balance.pyramid.top}%</span>
                <span>Heart {balance.pyramid.heart}%</span>
                <span>Base {balance.pyramid.base}%</span>
              </div>
            </div>

            {/* Active Notes List */}
            {entries.length === 0 ? (
              <div className="py-6 text-center border-t border-white/10 text-xs text-[#9C9283]">
                Select notes from the catalog to begin formulating your accord.
              </div>
            ) : (
              <div className="divide-y divide-white/8 border-t border-white/10 max-h-80 overflow-y-auto pr-1">
                {entries.map((entry) => (
                  <div
                    key={entry.note.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#F4EFE6] truncate">
                        {entry.note.name}
                      </div>
                      <div className="font-mono text-[11px] text-[#9C9283] uppercase">
                        {entry.note.layer} · {entry.drops} {entry.drops === 1 ? 'drop' : 'drops'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-[#D4AF6E] tabular-nums w-12 text-right">
                        {entry.percentage.toFixed(1)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveNote(entry.note.id)}
                        aria-label={`Remove ${entry.note.name} from blend`}
                        className="p-1.5 rounded text-[#8E8477] hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deterministic Balancing Engine */}
          <div className="p-5 rounded-xl bg-[#13110F] border border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-semibold text-[#F4EFE6]">
                Balance Diagnostics
              </h2>
              <span className={`font-mono text-xs font-medium ${statusTone.cls}`}>
                {statusTone.glyph} {statusTone.label}
              </span>
            </div>

            <p className="text-xs text-[#C7BEB0] leading-relaxed">{balance.summary}</p>

            {/* Facet Bars */}
            {balance.totalDrops > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-2 border-t border-white/10">
                {facetBars.map((f) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-[11px] font-mono text-[#A89F91] mb-1 tabular-nums">
                      <span>{f.label}</span>
                      <span>{f.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1F1C18] overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF6E]/85 transition-all duration-300"
                        style={{ width: `${f.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actionable Diagnostics */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              {balance.diagnostics.map((diag) => (
                <div key={diag.id} className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-[#F4EFE6]">
                    {diag.severity === 'balanced' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF6E] shrink-0" aria-hidden="true" />
                    )}
                    <span>{diag.title}</span>
                  </div>
                  <p className="text-[#9C9283] leading-relaxed pl-5">{diag.suggestion}</p>
                  {diag.targetLayer && (
                    <div className="pl-5">
                      <button
                        type="button"
                        onClick={() => setLayerFilter(diag.targetLayer!)}
                        className="text-[11px] font-mono text-[#D4AF6E] hover:underline cursor-pointer"
                      >
                        Browse {diag.targetLayer} notes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Primary Reveal CTA */}
          <button
            type="button"
            onClick={onReveal}
            disabled={balance.totalDrops === 0}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#D4AF6E] text-[#0A0908] text-sm font-semibold hover:bg-[#E0BE82] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            <span>Reveal My Fragrance</span>
          </button>
        </aside>
      </div>
    </div>
  );
};
