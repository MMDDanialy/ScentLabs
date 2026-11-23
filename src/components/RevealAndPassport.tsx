import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  RefreshCw,
} from 'lucide-react';
import { copyPassportSummary, exportPassportToPng } from '../services/audioAndExport';
import type { PassportData } from '../types/fragrance';

interface RevealAndPassportProps {
  passport: PassportData;
  isDistilling: boolean;
  isCritiqueLoading: boolean;
  critiqueNotice: string | null;
  isSaved: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateAlchemist: (name: string) => void;
  onRegenerateCritique: () => void;
  onSaveToLibrary: () => void;
  onReturnToLab: () => void;
}

export const RevealAndPassport: React.FC<RevealAndPassportProps> = ({
  passport,
  isDistilling,
  isCritiqueLoading,
  critiqueNotice,
  isSaved,
  onUpdateTitle,
  onUpdateAlchemist,
  onRegenerateCritique,
  onSaveToLibrary,
  onReturnToLab,
}) => {
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [alambicImgError, setAlambicImgError] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!exported) return;
    const t = setTimeout(() => setExported(false), 2400);
    return () => clearTimeout(t);
  }, [exported]);

  if (isDistilling) {
    return (
      <div
        className="mx-auto max-w-[960px] px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center min-h-[70vh]"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-xl overflow-hidden border border-[#D4AF6E]/30 bg-[#141210] mb-8">
          {!alambicImgError ? (
            <img
              src="/src/assets/images/distillation_alambic_1795443174104.jpg"
              alt="Precision brass and borosilicate glass distillation apparatus"
              referrerPolicy="no-referrer"
              onError={() => setAlambicImgError(true)}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-[#231B13] to-[#0E0C0A]" />
          )}
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
          Distillation & Match Analysis
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#F4EFE6] mt-2">
          Resolving olfactory profile...
        </h1>
        <p className="text-sm text-[#A89F91] mt-2 max-w-md">
          Computing normalized pyramid geometry, facet proximity, and reference benchmarks for{' '}
          {passport.totalDrops} virtual drops.
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyPassportSummary(passport);
    if (ok) setCopied(true);
  };

  const handleDownload = () => {
    const ok = exportPassportToPng(passport);
    if (ok) setExported(true);
  };

  const createdDate = new Date(passport.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-10">
      {/* Top Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
            Stage 03 · Distillation Reveal & Passport
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#F4EFE6] mt-1">
            {passport.fragranceName || 'Untitled Composition'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onReturnToLab}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-sm font-medium text-[#E5DDD0] hover:border-[#D4AF6E]/50 hover:text-[#F4EFE6] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Return to Lab</span>
        </button>
      </div>

      {/* Main Split: Breakdown Left + Collectible Passport Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Formulation Breakdown, Reference Matches & Editorial Critique */}
        <div className="lg:col-span-7 space-y-8">
          {/* Custom Title & Alchemist Form */}
          <section className="p-6 rounded-xl bg-[#13110F] border border-white/10 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-[#F4EFE6]">
              Personalize Archive Record
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fragrance-name-input"
                  className="block text-xs font-mono uppercase text-[#A89F91] mb-1.5"
                >
                  Fragrance Name
                </label>
                <input
                  id="fragrance-name-input"
                  type="text"
                  maxLength={48}
                  value={passport.fragranceName}
                  onChange={(e) => onUpdateTitle(e.target.value)}
                  placeholder="Enter bespoke title..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0A09] border border-white/15 text-sm text-[#F4EFE6] focus-visible:outline-2 focus-visible:outline-[#D4AF6E]"
                />
              </div>

              <div>
                <label
                  htmlFor="alchemist-name-input"
                  className="block text-xs font-mono uppercase text-[#A89F91] mb-1.5"
                >
                  Creator / Alchemist Name
                </label>
                <input
                  id="alchemist-name-input"
                  type="text"
                  maxLength={36}
                  value={passport.alchemistName}
                  onChange={(e) => onUpdateAlchemist(e.target.value)}
                  placeholder="Atelier Guest"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0A09] border border-white/15 text-sm text-[#F4EFE6] focus-visible:outline-2 focus-visible:outline-[#D4AF6E]"
                />
              </div>
            </div>

            {/* Unboxed Metadata Strip */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#C7BEB0]">
              <span className="text-[#D4AF6E] font-medium">
                {passport.balance.dominantFamily ?? 'Custom'} Family
              </span>
              <span aria-hidden="true">·</span>
              <span>{passport.moodTags.join(' / ')}</span>
              <span aria-hidden="true">·</span>
              <span>{passport.seasonTags.join(', ')}</span>
            </div>
          </section>

          {/* Editorial Critique */}
          <section className="p-6 rounded-xl bg-[#13110F] border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#F4EFE6]">
                  Olfactory Critique
                </h2>
                <p className="text-[11px] font-mono text-[#9C9283] mt-0.5">
                  {passport.critiqueSource === 'ai'
                    ? 'AI-assisted editorial critique grounded in your active formula'
                    : 'Deterministic atelier critique grounded in your active formula'}
                </p>
              </div>
              <button
                type="button"
                onClick={onRegenerateCritique}
                disabled={isCritiqueLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-[#E5DDD0] hover:border-[#D4AF6E]/50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCritiqueLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isCritiqueLoading ? 'Refining...' : 'Refresh Note'}</span>
              </button>
            </div>

            <p className="text-sm text-[#DED6C9] leading-relaxed">{passport.editorialCritique}</p>
            {critiqueNotice && (
              <p className="text-xs text-[#A89F91] pt-1">{critiqueNotice}</p>
            )}
          </section>

          {/* Closest Reference Perfume Matches */}
          <section className="p-6 rounded-xl bg-[#13110F] border border-white/10 space-y-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#F4EFE6]">
                Closest Reference Profiles
              </h2>
              <p className="text-xs text-[#9C9283] mt-1 leading-relaxed">
                Internal algorithmic similarity estimate derived from weighted note overlap, accord
                structure, and facet distance — not a chemical match, replication claim, or brand
                endorsement.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {passport.topMatches.slice(0, 3).map((match, idx) => (
                <div key={match.perfume.id} className="py-4 first:pt-2 last:pb-1 space-y-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono text-[#9C9283] mr-2">0{idx + 1}.</span>
                      <span className="font-serif text-xl font-semibold text-[#F4EFE6]">
                        {match.perfume.name}
                      </span>
                      <span className="text-xs text-[#A89F91] ml-2">
                        {match.perfume.house} · {match.perfume.releaseYear}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xl font-semibold text-[#D4AF6E] tabular-nums">
                        {match.similarityScore}%
                      </span>
                      <div className="text-[10px] font-mono uppercase text-[#9C9283]">
                        similarity est.
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#B9B0A2] leading-relaxed">
                    {match.perfume.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-[#9C9283] font-medium">Shared elements: </span>
                      <span className="text-[#E5DDD0]">
                        {match.sharedNotes.length > 0
                          ? match.sharedNotes.join(', ')
                          : match.sharedAccords.join(', ') || 'Facet balance'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9C9283] font-medium">Divergence: </span>
                      <span className="text-[#C7BEB0]">{match.keyDifferences[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Collectible Fragrance Identity Passport Card + Export Actions */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div
            className="rounded-xl bg-[#0D0B09] border border-[#D4AF6E]/45 p-6 sm:p-7 relative overflow-hidden"
            data-testid="passport-card"
          >
            {/* Inner hairline frame */}
            <div className="border border-[#D4AF6E]/20 rounded-lg p-5 sm:p-6 space-y-5 bg-[#110F0C]">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#D4AF6E]/15">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF6E]">
                    Fragrance Identity Passport
                  </div>
                  <div className="text-xs font-mono text-[#9C9283] mt-1 tabular-nums">
                    {passport.formulaCode} · {createdDate}
                  </div>
                </div>
                <span
                  className="w-8 h-8 rounded-full border border-[#F4EFE6]/30 shrink-0"
                  style={{ backgroundColor: passport.balance.blendedColorHex }}
                  title={`Blended hue ${passport.balance.blendedColorHex}`}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-serif text-3xl font-semibold text-[#F4EFE6] leading-tight">
                  {passport.fragranceName || 'Untitled Composition'}
                </h2>
                <p className="text-xs text-[#C7BEB0] mt-1.5">
                  Composed by <span className="text-[#F4EFE6] font-medium">{passport.alchemistName || 'Atelier Guest'}</span>
                  {' · '}
                  <span>{passport.balance.dominantFamily ?? 'Bespoke'}</span>
                </p>
              </div>

              {/* Pyramid Proportions */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full overflow-hidden bg-[#1D1A16] flex">
                  <div
                    style={{ width: `${passport.balance.pyramid.top}%` }}
                    className="bg-[#E8C967]"
                  />
                  <div
                    style={{ width: `${passport.balance.pyramid.heart}%` }}
                    className="bg-[#C86472]"
                  />
                  <div
                    style={{ width: `${passport.balance.pyramid.base}%` }}
                    className="bg-[#9C734B]"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#A89F91] tabular-nums">
                  <span>Top {passport.balance.pyramid.top}%</span>
                  <span>Heart {passport.balance.pyramid.heart}%</span>
                  <span>Base {passport.balance.pyramid.base}%</span>
                </div>
              </div>

              {/* Notes by Tier */}
              <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
                {(['top', 'heart', 'base'] as const).map((layer) => {
                  const layerEntries = passport.entries.filter((e) => e.note.layer === layer);
                  return (
                    <div key={layer}>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[#D4AF6E]">
                        {layer} Notes
                      </div>
                      <div className="text-[#E5DDD0] mt-0.5 leading-relaxed">
                        {layerEntries.length > 0
                          ? layerEntries
                              .map((e) => `${e.note.name} (${e.percentage}%)`)
                              .join(' · ')
                          : 'None'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reference Line */}
              {passport.topMatches[0] && (
                <div className="p-3.5 rounded-lg bg-[#0B0A09] border border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[#9C9283]">
                      Closest Algorithmic Match
                    </div>
                    <div className="text-sm font-medium text-[#F4EFE6] truncate mt-0.5">
                      {passport.topMatches[0].perfume.name} ({passport.topMatches[0].perfume.house})
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[#D4AF6E] tabular-nums shrink-0">
                    {passport.topMatches[0].similarityScore}%
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#8E8477] leading-relaxed pt-2 border-t border-white/8">
                Virtual creative composition & internal algorithmic similarity estimate. Not a
                physical chemical formula or official brand endorsement.
              </p>
            </div>
          </div>

          {/* Passport Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#D4AF6E] text-[#0A0908] text-sm font-semibold hover:bg-[#E0BE82] transition-colors cursor-pointer whitespace-nowrap"
            >
              {exported ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>PNG Exported</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download PNG</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/15 bg-[#13110F] text-[#F4EFE6] text-sm font-medium hover:border-[#D4AF6E]/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Summary Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onSaveToLibrary}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isSaved
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'border-[#D4AF6E]/35 bg-[#161412] text-[#F4EFE6] hover:border-[#D4AF6E]'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Saved to Atelier Library</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4 text-[#D4AF6E]" aria-hidden="true" />
                <span>Save to Library</span>
              </>
            )}
          </button>
        </aside>
      </div>
    </div>
  );
};
