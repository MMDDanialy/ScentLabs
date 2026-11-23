import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedDeterministicCritique } from '../i18n/engineLocalization';
import { copyPassportSummary, exportPassportToPng } from '../services/audioAndExport';
import { useTheme } from '../theme/ThemeContext';
import type { MatchResult, PassportData } from '../types/fragrance';

interface RevealAndPassportProps {
  passport: PassportData;
  isDistilling: boolean;
  isCritiqueLoading: boolean;
  critiqueNotice: string | null;
  matchError: string | null;
  isSaved: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateAlchemist: (name: string) => void;
  onRegenerateCritique: () => void;
  onRetryMatch: () => void;
  onSaveToLibrary: () => void;
  onReturnToLab: () => void;
}

const MatchCardRow: React.FC<{ match: MatchResult; index: number }> = ({ match, index }) => {
  const {
    locale,
    dict,
    t,
    formatNumber,
    getNoteName,
    getAccordLabel,
    getLayerLabel,
    getMatchExplanationCopy,
    getMatchDifferencesCopy,
  } = useI18n();
  const listSep = locale === 'fa' ? '، ' : ', ';

  const tierLabel =
    match.matchTier === 'strong'
      ? dict.reveal.matchTierStrong
      : match.matchTier === 'moderate'
      ? dict.reveal.matchTierModerate
      : dict.reveal.matchTierExploratory;

  const compKey = match.perfume.completeness;
  const completenessLabel =
    compKey === 'complete' || compKey === 'partial' || compKey === 'minimal'
      ? dict.reveal.completeness[compKey]
      : '';

  const confidence = match.confidenceScore ?? 80;
  const provenance = match.perfume.provenance;
  const metaParts = [
    match.perfume.house,
    match.perfume.concentration ? match.perfume.concentration.replace(/-/g, ' ') : null,
    match.perfume.releaseYear ? String(match.perfume.releaseYear) : null,
  ].filter(Boolean);

  const explanationText = getMatchExplanationCopy(match);
  const differences = getMatchDifferencesCopy(match);

  return (
    <div className="py-4 first:pt-2 last:pb-1 space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-mono text-[var(--vpl-text-muted)] tabular-nums">
              {formatNumber(index + 1, { minimumIntegerDigits: 2 })}
            </span>
            <span dir="ltr" className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
              {match.perfume.name}
            </span>
            <span dir="ltr" className="text-xs text-[var(--vpl-text-muted)]">
              {metaParts.join(' · ')}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--vpl-text-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={
                match.matchTier === 'strong'
                  ? 'text-[var(--vpl-accent)]'
                  : match.matchTier === 'moderate'
                  ? 'text-[var(--vpl-text-body)]'
                  : 'text-[var(--vpl-text-subtle)]'
              }
            >
              {tierLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t('reveal.confidenceLabel', { score: formatNumber(confidence) })}</span>
            {completenessLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{completenessLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-end shrink-0">
          <span className="font-mono text-xl font-semibold text-[var(--vpl-accent)] tabular-nums">
            {formatNumber(match.similarityScore)}%
          </span>
          <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
            {dict.reveal.similarityEst}
          </div>
        </div>
      </div>

      <p dir="ltr" className="text-xs text-[var(--vpl-text-body)] leading-relaxed">
        {match.perfume.description}
      </p>

      {explanationText && (
        <p className="text-[11px] font-mono text-[var(--vpl-text-muted)]">{explanationText}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5 text-xs">
        <div>
          <span className="text-[var(--vpl-text-muted)] font-medium">
            {dict.reveal.sharedElements}{' '}
          </span>
          <span className="text-[var(--vpl-text-secondary)]">
            {match.sharedNotes.length > 0
              ? match.sharedNotes.map((sn) => getNoteName(sn)).join(listSep)
              : match.sharedAccords.map((sa) => getAccordLabel(sa)).join(listSep) ||
                dict.reveal.accordsFallback}
          </span>
          {match.perfume.pyramidComplete &&
            match.matchedDetails &&
            match.matchedDetails.some((d) => d.tierAligned) && (
              <span className="text-[11px] text-[var(--vpl-accent)] ms-1.5">
                (
                {match.matchedDetails
                  .filter((d) => d.tierAligned)
                  .map((d) => `${getNoteName(d.noteName)} [${getLayerLabel(d.userLayer)}]`)
                  .join(listSep)}{' '}
                {dict.reveal.tierAlignedSuffix})
              </span>
            )}
        </div>
        <div>
          <span className="text-[var(--vpl-text-muted)] font-medium">
            {dict.reveal.divergence}{' '}
          </span>
          <span className="text-[var(--vpl-text-body)]">{differences[0]}</span>
        </div>
      </div>

      {provenance && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--vpl-text-subtle)] pt-1">
          <span>
            {t('reveal.sourceLabel', {
              provider: provenance.provider,
              license: provenance.license,
            })}
          </span>
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--vpl-accent)] hover:underline"
          >
            <span>{dict.reveal.viewReferenceRecord}</span>
            <ExternalLink className="w-3 h-3 rtl:-scale-x-100" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
};

export const RevealAndPassport: React.FC<RevealAndPassportProps> = ({
  passport,
  isDistilling,
  isCritiqueLoading,
  critiqueNotice,
  matchError,
  isSaved,
  onUpdateTitle,
  onUpdateAlchemist,
  onRegenerateCritique,
  onRetryMatch,
  onSaveToLibrary,
  onReturnToLab,
}) => {
  const {
    locale,
    dict,
    t,
    formatNumber,
    formatDate,
    getNoteCopy,
    getFamilyLabel,
    getLayerLabel,
    getMoodTagLabel,
    getSeasonTagLabel,
  } = useI18n();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [showAllExploratory, setShowAllExploratory] = useState(false);
  const [alambicImgError, setAlambicImgError] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!exported) return;
    const timer = setTimeout(() => setExported(false), 2400);
    return () => clearTimeout(timer);
  }, [exported]);

  if (isDistilling) {
    return (
      <div
        className="mx-auto max-w-[960px] px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center min-h-[70vh]"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-xl overflow-hidden border border-[var(--vpl-border-gold)] bg-[#141210] mb-8">
          {!alambicImgError ? (
            <img
              src="/src/assets/images/distillation_alambic_1795443174104.jpg"
              alt={dict.reveal.alambicAlt}
              referrerPolicy="no-referrer"
              onError={() => setAlambicImgError(true)}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-[#231B13] to-[#0E0C0A]" />
          )}
        </div>
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
          {dict.reveal.distillingEyebrow}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--vpl-text)] mt-2">
          {dict.reveal.distillingTitle}
        </h1>
        <p className="text-sm text-[var(--vpl-text-muted)] mt-2 max-w-md">
          {t('reveal.distillingSubtitle', { drops: formatNumber(passport.totalDrops) })}
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyPassportSummary(passport, locale);
    if (ok) setCopied(true);
  };

  const handleDownload = async () => {
    const ok = await exportPassportToPng(passport, locale, resolvedTheme);
    if (ok) setExported(true);
  };

  const createdDate = formatDate(passport.createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const strongAndModerate = passport.topMatches.filter(
    (m) => m.matchTier === 'strong' || m.matchTier === 'moderate' || !m.matchTier
  );
  const exploratory = passport.topMatches.filter((m) => m.matchTier === 'exploratory');
  const displayedExploratory = showAllExploratory ? exploratory : exploratory.slice(0, 3);

  const displayedCritique =
    passport.critiqueSource === 'ai'
      ? passport.editorialCritique
      : getLocalizedDeterministicCritique(
          locale,
          passport.fragranceName,
          passport.entries,
          passport.balance,
          passport.topMatches[0] ?? null
        );

  const localizedFamily = passport.balance.dominantFamily
    ? getFamilyLabel(passport.balance.dominantFamily)
    : dict.library.bespoke;

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-10">
      {/* Top Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--vpl-border)]">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
            {dict.reveal.stageEyebrow}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--vpl-text)] mt-1">
            {passport.fragranceName || dict.reveal.untitledComposition}
          </h1>
        </div>

        <button
          type="button"
          onClick={onReturnToLab}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--vpl-border-strong)] text-sm font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] hover:text-[var(--vpl-text)] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{dict.reveal.returnToLab}</span>
        </button>
      </div>

      {/* Main Split: Breakdown + Collectible Passport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulation Breakdown, Reference Matches & Editorial Critique */}
        <div className="lg:col-span-7 space-y-8">
          {/* Custom Title & Alchemist Form */}
          <section className="p-6 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-4">
            <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
              {dict.reveal.personalizeTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fragrance-name-input"
                  className="block text-xs font-mono uppercase text-[var(--vpl-text-muted)] mb-1.5"
                >
                  {dict.reveal.fragranceNameLabel}
                </label>
                <input
                  id="fragrance-name-input"
                  type="text"
                  maxLength={48}
                  value={passport.fragranceName}
                  onChange={(e) => onUpdateTitle(e.target.value)}
                  placeholder={dict.reveal.fragranceNamePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-sm text-[var(--vpl-text)] placeholder:text-[var(--vpl-text-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="alchemist-name-input"
                  className="block text-xs font-mono uppercase text-[var(--vpl-text-muted)] mb-1.5"
                >
                  {dict.reveal.alchemistNameLabel}
                </label>
                <input
                  id="alchemist-name-input"
                  type="text"
                  maxLength={36}
                  value={passport.alchemistName}
                  onChange={(e) => onUpdateAlchemist(e.target.value)}
                  placeholder={dict.reveal.alchemistNamePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-sm text-[var(--vpl-text)] placeholder:text-[var(--vpl-text-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--vpl-border)] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--vpl-text-body)]">
              <span className="text-[var(--vpl-accent)] font-medium">
                {t('reveal.familySuffix', { family: localizedFamily })}
              </span>
              <span aria-hidden="true">·</span>
              <span>{passport.moodTags.map((tag) => getMoodTagLabel(tag)).join(' / ')}</span>
              <span aria-hidden="true">·</span>
              <span>{passport.seasonTags.map((s) => getSeasonTagLabel(s)).join('، ')}</span>
            </div>
          </section>

          {/* Editorial Critique */}
          <section className="p-6 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
                  {dict.reveal.critiqueTitle}
                </h2>
                <p className="text-[11px] font-mono text-[var(--vpl-text-muted)] mt-0.5">
                  {passport.critiqueSource === 'ai'
                    ? dict.reveal.critiqueAiSubtitle
                    : dict.reveal.critiqueDeterministicSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onRegenerateCritique}
                disabled={isCritiqueLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--vpl-border-strong)] text-xs font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCritiqueLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isCritiqueLoading ? dict.reveal.refining : dict.reveal.refreshNote}</span>
              </button>
            </div>

            <p className="text-sm text-[var(--vpl-text-secondary)] leading-relaxed">
              {displayedCritique}
            </p>
            {critiqueNotice && (
              <p className="text-xs text-[var(--vpl-text-muted)] pt-1">{critiqueNotice}</p>
            )}
          </section>

          {/* Data-Driven Reference Perfume Matches */}
          <section className="p-6 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
                  {dict.reveal.matchesTitle}
                </h2>
                <p className="text-xs text-[var(--vpl-text-muted)] mt-1 leading-relaxed">
                  {passport.matchSummary
                    ? t('reveal.matchesSubtitleIndexed', {
                        searched: formatNumber(passport.matchSummary.searchedCount),
                        candidates: formatNumber(passport.matchSummary.candidateCount),
                      })
                    : dict.reveal.matchesSubtitleFallback}
                </p>
              </div>
            </div>

            {matchError ? (
              <div className="p-4 rounded-lg bg-[var(--vpl-danger-bg)] border border-[var(--vpl-danger-border)] flex items-center justify-between gap-4 text-xs text-[var(--vpl-danger-text)]">
                <span>{matchError}</span>
                <button
                  type="button"
                  onClick={onRetryMatch}
                  className="px-3 py-1.5 rounded bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold shrink-0 cursor-pointer"
                >
                  {dict.reveal.retryMatch}
                </button>
              </div>
            ) : (
              <>
                {passport.matchSummary?.lowMatchNotice && (
                  <div className="p-3.5 rounded-lg bg-[var(--vpl-bg-subtle)] border border-[var(--vpl-border-gold-soft)] text-xs text-[var(--vpl-text-secondary)]">
                    {dict.reveal.lowMatchNotice}
                  </div>
                )}

                {strongAndModerate.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-accent)] mb-2">
                      {t('reveal.primaryAlignments', {
                        count: formatNumber(strongAndModerate.length),
                      })}
                    </div>
                    <div className="divide-y divide-[var(--vpl-border)]">
                      {strongAndModerate.map((match, idx) => (
                        <MatchCardRow key={match.perfume.id} match={match} index={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {exploratory.length > 0 && (
                  <div className="pt-2 border-t border-[var(--vpl-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-text-muted)]">
                        {t('reveal.exploratoryResemblances', {
                          count: formatNumber(exploratory.length),
                        })}
                      </span>
                      {exploratory.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllExploratory((v) => !v)}
                          className="text-xs text-[var(--vpl-accent)] hover:underline cursor-pointer"
                        >
                          {showAllExploratory
                            ? dict.reveal.showFewer
                            : t('reveal.showAllExploratory', {
                                count: formatNumber(exploratory.length),
                              })}
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-[var(--vpl-border)]">
                      {displayedExploratory.map((match, idx) => (
                        <MatchCardRow
                          key={match.perfume.id}
                          match={match}
                          index={strongAndModerate.length + idx}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Collectible Fragrance Identity Passport Card + Export Actions */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div
            className="rounded-xl bg-[var(--vpl-bg-passport)] border border-[var(--vpl-border-gold)] p-6 sm:p-7 relative overflow-hidden"
            data-testid="passport-card"
          >
            <div className="border border-[var(--vpl-border-gold-soft)] rounded-lg p-5 sm:p-6 space-y-5 bg-[var(--vpl-bg-passport-inner)]">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--vpl-border-gold-soft)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 ${
                      isLight
                        ? 'rounded-lg p-1.5 bg-[#14110D] border border-[var(--vpl-border-gold)]'
                        : ''
                    }`}
                  >
                    <img
                      src="/virtual_perfume_lab_symbol_transparent.png"
                      alt={dict.reveal.passportCrestAlt}
                      className="w-9 h-9 object-contain shrink-0"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                      {dict.reveal.passportTitle}
                    </div>
                    <div className="text-xs font-mono text-[var(--vpl-text-muted)] mt-0.5 tabular-nums flex flex-wrap items-center gap-1.5">
                      <span dir="ltr">{passport.formulaCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{createdDate}</span>
                    </div>
                  </div>
                </div>
                <span
                  className="w-8 h-8 rounded-full border border-[var(--vpl-border-strong)] shrink-0"
                  style={{ backgroundColor: passport.balance.blendedColorHex }}
                  title={passport.balance.blendedColorHex}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-serif text-3xl font-semibold text-[var(--vpl-text)] leading-tight">
                  {passport.fragranceName || dict.reveal.untitledComposition}
                </h2>
                <p className="text-xs text-[var(--vpl-text-body)] mt-1.5">
                  {dict.reveal.composedBy}{' '}
                  <span className="text-[var(--vpl-text)] font-medium">
                    {passport.alchemistName || dict.reveal.defaultAlchemist}
                  </span>
                  {' · '}
                  <span>{localizedFamily}</span>
                </p>
              </div>

              {/* Pyramid Proportions */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full overflow-hidden bg-[var(--vpl-bg-bar-track)] flex">
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
                <div className="flex justify-between text-[11px] font-mono text-[var(--vpl-text-muted)] tabular-nums">
                  <span>
                    {getLayerLabel('top')} {formatNumber(passport.balance.pyramid.top)}%
                  </span>
                  <span>
                    {getLayerLabel('heart')} {formatNumber(passport.balance.pyramid.heart)}%
                  </span>
                  <span>
                    {getLayerLabel('base')} {formatNumber(passport.balance.pyramid.base)}%
                  </span>
                </div>
              </div>

              {/* Notes by Tier */}
              <div className="space-y-3 pt-2 border-t border-[var(--vpl-border)] text-xs">
                {(['top', 'heart', 'base'] as const).map((layer) => {
                  const layerEntries = passport.entries.filter((e) => e.note.layer === layer);
                  return (
                    <div key={layer}>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--vpl-accent)]">
                        {t('reveal.notesSectionSuffix', { layer: getLayerLabel(layer) })}
                      </div>
                      <div className="text-[var(--vpl-text-secondary)] mt-0.5 leading-relaxed">
                        {layerEntries.length > 0
                          ? layerEntries
                              .map(
                                (e) => `${getNoteCopy(e.note).name} (${formatNumber(e.percentage)}%)`
                              )
                              .join(' · ')
                          : dict.reveal.noneLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Closest Reference Line */}
              {passport.topMatches[0] && (
                <div className="p-3.5 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border)] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
                      {dict.reveal.closestMatchLabel}
                    </div>
                    <div
                      dir="ltr"
                      className="text-sm font-medium text-[var(--vpl-text)] truncate mt-0.5 text-start"
                    >
                      {passport.topMatches[0].perfume.name} ({passport.topMatches[0].perfume.house})
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[var(--vpl-accent)] tabular-nums shrink-0">
                    {formatNumber(passport.topMatches[0].similarityScore)}%
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[var(--vpl-text-subtle)] leading-relaxed pt-2 border-t border-[var(--vpl-border-subtle)]">
                {dict.reveal.passportDisclaimer}
              </p>
            </div>
          </div>

          {/* Passport Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-sm font-semibold hover:bg-[var(--vpl-accent-hover)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {exported ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{dict.reveal.pngExported}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>{dict.reveal.downloadPng}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--vpl-border-strong)] bg-[var(--vpl-bg-card)] text-[var(--vpl-text)] text-sm font-medium hover:border-[var(--vpl-accent)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[var(--vpl-success)]" aria-hidden="true" />
                  <span>{dict.reveal.summaryCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>{dict.reveal.copySummary}</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onSaveToLibrary}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isSaved
                ? 'bg-[var(--vpl-success-bg)] border-[var(--vpl-success-border)] text-[var(--vpl-success-text)]'
                : 'border-[var(--vpl-border-gold)] bg-[var(--vpl-bg-card)] text-[var(--vpl-text)] hover:border-[var(--vpl-accent)]'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[var(--vpl-success)]" aria-hidden="true" />
                <span>{dict.reveal.savedToLibrary}</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4 text-[var(--vpl-accent)]" aria-hidden="true" />
                <span>{dict.reveal.saveToLibrary}</span>
              </>
            )}
          </button>
        </aside>
      </div>
    </div>
  );
};

