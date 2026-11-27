import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import {
  getLocalizedDeterministicCritique,
  getLocalizedGender,
  getLocalizedGenderSource,
  interpolate,
} from '../i18n/engineLocalization';
import {
  copyPassportSummary,
  exportPassportToPng,
  formatPassportSummary,
} from '../services/audioAndExport';
import { useTheme } from '../theme/ThemeContext';
import type {
  CritiqueStatus,
  MatchResult,
  PassportData,
  PerfumeGender,
} from '../types/fragrance';

interface RevealAndPassportProps {
  passport: PassportData;
  isDistilling: boolean;
  isCritiqueLoading: boolean;
  isMatchingGender: boolean;
  genderFilter: PerfumeGender | 'all';
  critiqueNotice: string | null;
  matchError: string | null;
  isSaved: boolean;
  hasUnsavedChanges: boolean;
  onChangeGenderFilter: (gender: PerfumeGender | 'all') => void;
  onUpdateTitle: (title: string) => void;
  onUpdateAlchemist: (name: string) => void;
  onRegenerateCritique: () => void;
  onRetryMatch: () => void;
  onSaveToLibrary: () => void;
  onReturnToLab: () => void;
}

const GENDER_FILTER_OPTIONS: (PerfumeGender | 'all')[] = [
  'all',
  'masculine',
  'feminine',
  'unisex',
  'unknown',
];

const MatchCardRow: React.FC<{ match: MatchResult; index: number }> = ({ match, index }) => {
  const {
    locale,
    dict,
    t,
    formatNumber,
    formatDate,
    getNoteName,
    getAccordLabel,
    getLayerLabel,
    getMatchExplanationCopy,
    getMatchDifferencesCopy,
  } = useI18n();
  const [expanded, setExpanded] = useState(false);
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

  const genderLabel = getLocalizedGender(locale, match.perfume.gender);
  const genderSourceLabel = getLocalizedGenderSource(locale, match.perfume.genderSource);

  const provenance = match.perfume.provenance;
  const metaParts = [
    match.perfume.house,
    match.perfume.concentration ? match.perfume.concentration.replace(/-/g, ' ') : null,
    match.perfume.releaseYear ? String(match.perfume.releaseYear) : null,
  ].filter(Boolean);

  const explanationText = getMatchExplanationCopy(match);
  const differences = getMatchDifferencesCopy(match);

  const nc = match.noteComparison;
  const breakdownEntries = match.scoreBreakdown
    ? ([
        ['userNoteCoverage', match.scoreBreakdown.userNoteCoverage],
        ['refPrecision', match.scoreBreakdown.refPrecision],
        ['tierNoteAlignment', match.scoreBreakdown.tierNoteAlignment],
        ['pyramidDistribution', match.scoreBreakdown.pyramidDistribution],
        ['familyAccord', match.scoreBreakdown.familyAccord],
        ['facetProximity', match.scoreBreakdown.facetProximity],
      ] as const)
    : [];

  return (
    <div className="py-4 first:pt-2 last:pb-1 space-y-2.5" data-testid={`match-row-${match.perfume.id}`}>
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

          <div className="text-[11px] font-mono text-[var(--vpl-text-muted)] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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

            {match.confidenceReliable && match.confidenceScore !== null ? (
              <span data-testid="match-confidence-badge">
                {t('reveal.confidenceLabel', { score: formatNumber(match.confidenceScore) })}
              </span>
            ) : (
              <span
                className="text-[var(--vpl-warning)]"
                title={match.confidenceReason || dict.reveal.confidenceInsufficientReason}
                data-testid="match-confidence-insufficient"
              >
                {dict.reveal.confidenceInsufficient}
              </span>
            )}

            <span aria-hidden="true">·</span>

            <span>
              {t('reveal.weightedAlignmentBadge', {
                score: formatNumber(match.weightedNoteAlignment ?? 0),
              })}
            </span>

            <span aria-hidden="true">·</span>

            <span
              className="px-1.5 py-0.5 rounded bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border)] text-[var(--vpl-text-secondary)]"
              title={genderSourceLabel}
              data-testid="match-gender-badge"
            >
              {genderLabel}
            </span>

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

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-[var(--vpl-accent)] hover:underline font-medium cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{dict.reveal.hideProfileDetails}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{dict.reveal.openProfileDetails}</span>
            </>
          )}
        </button>

        {provenance && (
          <div className="flex flex-wrap items-center gap-3 text-[var(--vpl-text-subtle)]">
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

      {expanded && (
        <div
          className="mt-2 p-4 rounded-xl bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border)] space-y-4 text-xs"
          data-testid={`match-details-${match.perfume.id}`}
        >
          {/* Metadata Transparency Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-[var(--vpl-border-subtle)]">
            <div>
              <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.admin.colGender}
              </div>
              <div className="text-[var(--vpl-text)] font-medium mt-0.5">{genderLabel}</div>
              <div className="text-[10px] text-[var(--vpl-text-subtle)]">{genderSourceLabel}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.reveal.concentrationLabel}
              </div>
              <div dir="ltr" className="text-[var(--vpl-text)] font-medium mt-0.5 capitalize text-start">
                {match.perfume.concentration
                  ? match.perfume.concentration.replace(/-/g, ' ')
                  : dict.reveal.noneLabel}
              </div>
              <div className="text-[10px] text-[var(--vpl-text-subtle)] tabular-nums">
                {match.perfume.releaseYear
                  ? formatNumber(match.perfume.releaseYear, { useGrouping: false })
                  : dict.reveal.yearUnrecorded}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.reveal.perfumersLabel}
              </div>
              <div dir="ltr" className="text-[var(--vpl-text)] font-medium mt-0.5 text-start">
                {match.perfume.perfumers.length > 0
                  ? match.perfume.perfumers.join(', ')
                  : dict.reveal.noneLabel}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.reveal.verifiedDateLabel}
              </div>
              <div className="text-[var(--vpl-text)] font-mono mt-0.5">
                {provenance?.verifiedAt
                  ? formatDate(provenance.verifiedAt, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : dict.reveal.noneLabel}
              </div>
              <div dir="ltr" className="text-[10px] text-[var(--vpl-text-subtle)] text-start">
                {match.perfume.family}
              </div>
            </div>
          </div>

          {!match.confidenceReliable && (
            <p className="text-[11px] text-[var(--vpl-warning)] bg-[var(--vpl-bg-card)] px-3 py-2 rounded border border-[var(--vpl-border)]">
              {match.confidenceReason || dict.reveal.confidenceInsufficientReason}
            </p>
          )}

          {/* Documented Reference Pyramid */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
              {dict.reveal.documentedPyramidTitle}
            </div>
            {match.perfume.pyramidComplete ||
            match.perfume.topNoteNames.length > 0 ||
            match.perfume.heartNoteNames.length > 0 ||
            match.perfume.baseNoteNames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    ['top', match.perfume.topNoteNames],
                    ['heart', match.perfume.heartNoteNames],
                    ['base', match.perfume.baseNoteNames],
                  ] as const
                ).map(([layer, list]) => (
                  <div
                    key={layer}
                    className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)]"
                  >
                    <div className="text-[10px] font-mono uppercase text-[var(--vpl-text-muted)] mb-1">
                      {getLayerLabel(layer)}
                    </div>
                    <div dir="ltr" className="text-[11px] text-[var(--vpl-text-secondary)] text-start">
                      {list.length > 0 ? list.join(', ') : dict.reveal.noneLabel}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)] space-y-1.5">
                <p className="text-[11px] text-[var(--vpl-warning)]">
                  {dict.reveal.flatNotesOnlyNotice}
                </p>
                <p dir="ltr" className="text-[11px] text-[var(--vpl-text-secondary)] text-start">
                  {match.perfume.allNoteNames.length > 0
                    ? match.perfume.allNoteNames.join(', ')
                    : dict.reveal.noneLabel}
                </p>
              </div>
            )}
          </div>

          {/* 5-Category Note Tier Audit */}
          {nc && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                {dict.reveal.noteComparisonTitle}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--vpl-success)] mb-1">
                    {dict.reveal.ncExactShared} ({formatNumber(nc.exactShared.length)})
                  </div>
                  <div className="text-[11px] text-[var(--vpl-text-secondary)]">
                    {nc.exactShared.length > 0
                      ? nc.exactShared
                          .map((d) => `${getNoteName(d.noteName)} [${getLayerLabel(d.userLayer)}]`)
                          .join(listSep)
                      : dict.reveal.noneLabel}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--vpl-accent)] mb-1">
                    {dict.reveal.ncTierMismatch} ({formatNumber(nc.tierMismatchShared.length)})
                  </div>
                  <div className="text-[11px] text-[var(--vpl-text-secondary)]">
                    {nc.tierMismatchShared.length > 0
                      ? nc.tierMismatchShared
                          .map((d) => {
                            const refLayerLabel =
                              d.refLayer === 'unspecified'
                                ? dict.reveal.ncUnknownUndocumented
                                : getLayerLabel(d.refLayer);
                            const swap = interpolate(dict.reveal.tierSwapFormat, {
                              userLayer: getLayerLabel(d.userLayer),
                              refLayer: refLayerLabel,
                            });
                            return `${getNoteName(d.noteName)} (${swap})`;
                          })
                          .join(listSep)
                      : dict.reveal.noneLabel}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--vpl-text-muted)] mb-1">
                    {dict.reveal.ncUndocumentedShared} (
                    {formatNumber(nc.undocumentedTierShared.length)})
                  </div>
                  <div className="text-[11px] text-[var(--vpl-text-secondary)]">
                    {nc.undocumentedTierShared.length > 0
                      ? nc.undocumentedTierShared
                          .map((d) => `${getNoteName(d.noteName)} [${getLayerLabel(d.userLayer)}]`)
                          .join(listSep)
                      : dict.reveal.noneLabel}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)]">
                  <div className="text-[10px] font-mono text-[var(--vpl-text-muted)] mb-1">
                    {dict.reveal.ncUserOnly} ({formatNumber(nc.userOnly.length)})
                  </div>
                  <div className="text-[11px] text-[var(--vpl-text-secondary)]">
                    {nc.userOnly.length > 0
                      ? nc.userOnly
                          .map((u) => `${getNoteName(u.noteId)} (${formatNumber(u.share)}%)`)
                          .join(listSep)
                      : dict.reveal.noneLabel}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)] sm:col-span-2">
                  <div className="text-[10px] font-mono text-[var(--vpl-text-muted)] mb-1">
                    {dict.reveal.ncReferenceOnly} ({formatNumber(nc.referenceOnly.length)})
                  </div>
                  <div dir="ltr" className="text-[11px] text-[var(--vpl-text-secondary)] text-start">
                    {nc.referenceOnly.length > 0
                      ? nc.referenceOnly
                          .slice(0, 14)
                          .map((r) =>
                            r.layer === 'unspecified'
                              ? r.noteName
                              : `${r.noteName} (${r.layer})`
                          )
                          .join(', ')
                      : dict.reveal.noneLabel}
                  </div>
                </div>

                {nc.unknownOrUndocumented.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-subtle)] sm:col-span-2">
                    <div className="text-[10px] font-mono text-[var(--vpl-warning)] mb-1">
                      {dict.reveal.ncUnknownUndocumented} (
                      {formatNumber(nc.unknownOrUndocumented.length)})
                    </div>
                    <div dir="ltr" className="text-[11px] text-[var(--vpl-text-secondary)] text-start">
                      {nc.unknownOrUndocumented.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Algorithmic Score Breakdown */}
          {breakdownEntries.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                {dict.reveal.scoreBreakdownTitle}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {breakdownEntries.map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--vpl-text-muted)]">
                        {dict.reveal.breakdownMetrics[key]}
                      </span>
                      <span className="font-mono text-[var(--vpl-text)] tabular-nums">
                        {formatNumber(val)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--vpl-bg-bar-track)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--vpl-accent)] rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-[var(--vpl-text-subtle)] pt-1 border-t border-[var(--vpl-border-subtle)]">
            {dict.reveal.nonProprietaryNotice}
          </p>
        </div>
      )}
    </div>
  );
};

export const RevealAndPassport: React.FC<RevealAndPassportProps> = ({
  passport,
  isDistilling,
  isCritiqueLoading,
  isMatchingGender,
  genderFilter,
  critiqueNotice,
  matchError,
  isSaved,
  hasUnsavedChanges,
  onChangeGenderFilter,
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
  const [fallbackSummaryText, setFallbackSummaryText] = useState<string | null>(null);
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
    if (ok) {
      setCopied(true);
      setFallbackSummaryText(null);
    } else {
      setFallbackSummaryText(formatPassportSummary(passport, locale));
    }
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

  const effectiveCritiqueStatus: CritiqueStatus =
    passport.critiqueStatus ??
    (passport.critiqueSource === 'ai' ? 'ai-live' : 'deterministic-default');

  const critiqueBadgeText =
    effectiveCritiqueStatus === 'ai-live'
      ? dict.reveal.critiqueBadgeAi
      : effectiveCritiqueStatus === 'ai-cached'
      ? dict.reveal.critiqueBadgeAiCached
      : effectiveCritiqueStatus === 'deterministic-fallback'
      ? dict.reveal.critiqueBadgeFallback
      : dict.reveal.critiqueBadgeDeterministic;

  const critiqueSubtitleText =
    effectiveCritiqueStatus === 'ai-live'
      ? dict.reveal.critiqueAiSubtitle
      : effectiveCritiqueStatus === 'ai-cached'
      ? dict.reveal.critiqueCachedSubtitle
      : effectiveCritiqueStatus === 'deterministic-fallback'
      ? dict.reveal.critiqueFallbackSubtitle
      : dict.reveal.critiqueDeterministicSubtitle;

  const isAiActive =
    effectiveCritiqueStatus === 'ai-live' || effectiveCritiqueStatus === 'ai-cached';

  const localizedFamily = passport.balance.dominantFamily
    ? getFamilyLabel(passport.balance.dominantFamily)
    : dict.library.bespoke;

  const passportLiquidHex =
    passport.balance.liquidAppearance?.liquidColorHex ?? passport.balance.blendedColorHex;
  const passportDeepHex =
    passport.balance.liquidAppearance?.deepColorHex ?? passportLiquidHex;

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
              <span>
                {passport.seasonTags
                  .map((s) => getSeasonTagLabel(s))
                  .join(locale === 'fa' ? '، ' : ', ')}
              </span>
            </div>
          </section>

          {/* Editorial Critique */}
          <section className="p-6 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-xl font-semibold text-[var(--vpl-text)]">
                    {dict.reveal.critiqueTitle}
                  </h2>
                  <span
                    data-testid="critique-status-badge"
                    className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${
                      isAiActive
                        ? 'bg-[var(--vpl-accent-soft)] border-[var(--vpl-border-gold)] text-[var(--vpl-accent)]'
                        : effectiveCritiqueStatus === 'deterministic-fallback'
                        ? 'bg-[var(--vpl-bg-inset)] border-[var(--vpl-warning)] text-[var(--vpl-warning)]'
                        : 'bg-[var(--vpl-bg-subtle)] border-[var(--vpl-border-strong)] text-[var(--vpl-text-muted)]'
                    }`}
                  >
                    {critiqueBadgeText}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[var(--vpl-text-muted)] mt-0.5">
                  {critiqueSubtitleText}
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
            {(critiqueNotice || passport.critiqueReason) && (
              <p className="text-xs text-[var(--vpl-text-muted)] pt-1">
                {critiqueNotice || passport.critiqueReason}
              </p>
            )}
          </section>

          {/* Data-Driven Reference Perfume Matches */}
          <section className="p-6 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-5">
            <div className="space-y-3">
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

              {/* Gender Classification Filter Bar */}
              <div
                className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--vpl-border-subtle)]"
                role="group"
                aria-label={dict.reveal.genderFilterLabel}
              >
                <span className="text-[11px] font-mono text-[var(--vpl-text-muted)]">
                  {dict.reveal.genderFilterLabel}
                </span>
                {GENDER_FILTER_OPTIONS.map((gOpt) => {
                  const active = genderFilter === gOpt;
                  const label =
                    gOpt === 'all' ? dict.reveal.allGenders : getLocalizedGender(locale, gOpt);
                  return (
                    <button
                      key={gOpt}
                      type="button"
                      disabled={isMatchingGender}
                      aria-pressed={active}
                      onClick={() => onChangeGenderFilter(gOpt)}
                      data-testid={`gender-filter-${gOpt}`}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                        active
                          ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] border-[var(--vpl-accent)] font-semibold'
                          : 'bg-[var(--vpl-bg-inset)] border-[var(--vpl-border-strong)] text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-accent)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
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

                {strongAndModerate.length === 0 && exploratory.length === 0 && (
                  <div className="p-4 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border)] text-xs text-[var(--vpl-text-muted)] text-center">
                    {dict.reveal.lowMatchNotice}
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
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${passportLiquidHex}, ${passportDeepHex})`,
                  }}
                  title={passportLiquidHex}
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
            data-testid="save-library-btn"
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isSaved && !hasUnsavedChanges
                ? 'bg-[var(--vpl-success-bg)] border-[var(--vpl-success-border)] text-[var(--vpl-success-text)]'
                : 'border-[var(--vpl-border-gold)] bg-[var(--vpl-bg-card)] text-[var(--vpl-text)] hover:border-[var(--vpl-accent)]'
            }`}
          >
            {isSaved && !hasUnsavedChanges ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[var(--vpl-success)]" aria-hidden="true" />
                <span>{dict.reveal.savedToLibrary}</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4 text-[var(--vpl-accent)]" aria-hidden="true" />
                <span>
                  {isSaved && hasUnsavedChanges
                    ? dict.reveal.updateSaved
                    : dict.reveal.saveToLibrary}
                </span>
              </>
            )}
          </button>

          {fallbackSummaryText && (
            <div className="p-4 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-gold)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase text-[var(--vpl-accent)]">
                  {dict.reveal.clipboardFallbackTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setFallbackSummaryText(null)}
                  className="text-xs text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)] cursor-pointer"
                >
                  {dict.reveal.clipboardClose}
                </button>
              </div>
              <p className="text-xs text-[var(--vpl-text-muted)] leading-relaxed">
                {dict.reveal.clipboardFallbackHint}
              </p>
              <textarea
                readOnly
                value={fallbackSummaryText}
                rows={6}
                onFocus={(e) => e.currentTarget.select()}
                aria-label={dict.reveal.clipboardFallbackTitle}
                className="w-full p-2.5 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-xs font-mono text-[var(--vpl-text)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
