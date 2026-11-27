import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { getLocalizedGender } from '../i18n/engineLocalization';
import { useI18n } from '../i18n/I18nContext';
import type {
  AdminCatalogPage,
  AdminImportRecordInput,
  AdminImportResult,
  DataCompletenessStatus,
  PerfumeGender,
} from '../types/fragrance';

interface AdminCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogUpdated: () => void;
}

const SAMPLE_IMPORT_JSON = `[
  {
    "name": "Bergamot Tea Study No. 4",
    "house": "Atelier Archive",
    "year": 2026,
    "concentration": "eau-de-parfum",
    "gender": "unisex",
    "family": "Sunlit Citrus",
    "character": ["citrusy", "herbal", "woody", "fresh"],
    "top_notes": ["Bergamot", "Pink Pepper"],
    "heart_notes": ["Smoked tea", "Cardamom"],
    "base_notes": ["Cedarwood", "Vetiver"]
  }
]`;

export const AdminCatalogModal: React.FC<AdminCatalogModalProps> = ({
  isOpen,
  onClose,
  onCatalogUpdated,
}) => {
  const { locale, dict, t, formatNumber, formatDate, getNoteName } = useI18n();

  const [data, setData] = useState<AdminCatalogPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [completeness, setCompleteness] = useState<DataCompletenessStatus | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<PerfumeGender | 'all'>('all');
  const [familyFilter, setFamilyFilter] = useState('');
  const [page, setPage] = useState(1);

  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState(SAMPLE_IMPORT_JSON);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AdminImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        completeness,
        gender: genderFilter,
      });
      if (query.trim()) params.set('q', query.trim());
      if (familyFilter) params.set('family', familyFilter);

      const res = await fetch(`/api/admin/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(dict.admin.loadError);
      const json = (await res.json()) as AdminCatalogPage;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.loadError);
    } finally {
      setLoading(false);
    }
  }, [page, query, completeness, genderFilter, familyFilter, dict.admin.loadError]);

  useEffect(() => {
    if (isOpen) {
      void fetchCatalog();
    }
  }, [isOpen, fetchCatalog]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError(dict.admin.importInvalidJson);
      return;
    }

    const records = Array.isArray(parsed)
      ? (parsed as AdminImportRecordInput[])
      : [parsed as AdminImportRecordInput];

    setImporting(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const json = (await res.json()) as AdminImportResult & { error?: string };
      if (!res.ok) {
        setImportError(json.error || dict.admin.importFailed);
      } else {
        setImportResult(json);
        onCatalogUpdated();
        await fetchCatalog();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : dict.admin.importFailed);
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const stats = data?.stats;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalFiltered / data.limit)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-catalog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[var(--vpl-bg-modal)] border border-[var(--vpl-border-gold)] rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--vpl-border)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Database className="w-5 h-5 text-[var(--vpl-accent)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                {dict.admin.eyebrow}
              </p>
              <h2
                id="admin-catalog-title"
                className="font-serif text-2xl font-semibold text-[var(--vpl-text)] truncate"
              >
                {dict.admin.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict.admin.closeAria}
            className="p-2 rounded-lg border border-[var(--vpl-border)] text-[var(--vpl-text-body)] hover:text-[var(--vpl-text)] hover:border-[var(--vpl-border-gold)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-[var(--vpl-danger-bg)] border border-[var(--vpl-danger-border)] text-sm text-[var(--vpl-danger-text)]">
              {error}
            </div>
          )}

          {/* Coverage & Health Metrics */}
          {stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                    {formatNumber(stats.totalPerfumes)}
                  </div>
                  <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                    {dict.admin.statPerfumes}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                    {formatNumber(stats.totalHouses)}
                  </div>
                  <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                    {dict.admin.statHouses}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                    {formatNumber(stats.totalMaterials)}
                  </div>
                  <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                    {t('admin.statNotes', {
                      active: formatNumber(stats.totalNormalizedNotesInCatalog),
                    })}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  <div className="font-mono text-2xl font-semibold text-[var(--vpl-accent)] tabular-nums">
                    {formatNumber(stats.completePyramids)}
                  </div>
                  <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                    {dict.admin.statCompletePyramids} (
                    {t('admin.statFlatOnly', { count: formatNumber(stats.flatNotesOnly) })})
                  </div>
                </div>
              </div>

              {/* Count Clarification & Gender Metadata Summary */}
              <div className="p-3.5 rounded-lg bg-[var(--vpl-bg-subtle)] border border-[var(--vpl-border-gold-soft)] space-y-1.5 text-xs text-[var(--vpl-text-secondary)]">
                <div>
                  {t('admin.countClarificationBanner', {
                    total: formatNumber(stats.totalPerfumes),
                    complete: formatNumber(stats.completePyramids),
                    flat: formatNumber(stats.flatNotesOnly),
                    accords: formatNumber(stats.starterAccordsCount ?? 4),
                  })}
                </div>
                {stats.genderCounts && (
                  <div className="text-[11px] font-mono text-[var(--vpl-text-muted)] tabular-nums">
                    {t('admin.genderBreakdownLine', {
                      masculine: formatNumber(stats.genderCounts.masculine ?? 0),
                      feminine: formatNumber(stats.genderCounts.feminine ?? 0),
                      unisex: formatNumber(stats.genderCounts.unisex ?? 0),
                      unknown: formatNumber(stats.genderCounts.unknown ?? 0),
                    })}
                  </div>
                )}
              </div>

              {/* Provenance, Completeness & Freshness Strip */}
              <div className="p-4 rounded-lg bg-[var(--vpl-bg-elevated)] border border-[var(--vpl-border)] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                    {dict.admin.sourcesTitle}
                  </div>
                  {stats.sources.map((src) => (
                    <div
                      key={`${src.provider}-${src.license}`}
                      className="flex items-center justify-between gap-2 text-[var(--vpl-text-secondary)]"
                    >
                      <span className="truncate">
                        {src.provider} ({src.license})
                      </span>
                      <span className="font-mono text-[var(--vpl-text-muted)] shrink-0 tabular-nums">
                        {t('admin.recordsCount', { count: formatNumber(src.count) })}
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-[var(--vpl-text-muted)] pt-1">
                    {dict.admin.attributionLine}{' '}
                    <a
                      href="https://www.scento.com/perfume-database"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--vpl-accent)] hover:underline"
                    >
                      <span dir="ltr">Scento — scento.com/perfume-database</span>
                    </a>
                    . {dict.admin.commercialNote}
                  </p>
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-[var(--vpl-text-body)]">
                  <div className="uppercase tracking-wider text-[var(--vpl-accent)]">
                    {dict.admin.integrityTitle}
                  </div>
                  <div>
                    {t('admin.integrityLine1', {
                      complete: formatNumber(stats.completePyramids),
                      partial: formatNumber(stats.partialPyramids),
                      flat: formatNumber(stats.flatNotesOnly),
                    })}
                  </div>
                  <div>
                    {t('admin.integrityLine2', {
                      missingYears: formatNumber(stats.missingYears),
                      dups: formatNumber(stats.duplicateCount),
                      failed: formatNumber(stats.failedImports),
                    })}
                  </div>
                  <div>
                    {t('admin.lastUpdated', {
                      date: formatDate(stats.lastUpdatedAt, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Toolbar: Search, Gender/Family/Completeness Filters, Incremental Import Toggle */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="w-4 h-4 text-[var(--vpl-text-muted)] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={dict.admin.searchPlaceholder}
                  className="w-full ps-9 pe-3 py-2 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-xs text-[var(--vpl-text)] placeholder:text-[var(--vpl-text-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
                />
              </div>

              <select
                aria-label={dict.admin.genderFilterAria}
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value as PerfumeGender | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-xs text-[var(--vpl-text)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer"
              >
                <option value="all">{dict.admin.allGenders}</option>
                <option value="masculine">{dict.domain.genders.masculine}</option>
                <option value="feminine">{dict.domain.genders.feminine}</option>
                <option value="unisex">{dict.domain.genders.unisex}</option>
                <option value="unknown">{dict.domain.genders.unknown}</option>
              </select>

              <select
                aria-label={dict.admin.familyFilterAria}
                value={familyFilter}
                onChange={(e) => {
                  setFamilyFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-xs text-[var(--vpl-text)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer"
              >
                <option value="">{dict.admin.allFamilies}</option>
                {(stats?.availableFamilies ?? []).map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>

              <select
                aria-label={dict.admin.filterCompletenessAria}
                value={completeness}
                onChange={(e) => {
                  setCompleteness(e.target.value as DataCompletenessStatus | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-strong)] text-xs text-[var(--vpl-text)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer"
              >
                <option value="all">{dict.admin.allCompleteness}</option>
                <option value="complete">{dict.admin.completeOpt}</option>
                <option value="partial">{dict.admin.partialOpt}</option>
                <option value="minimal">{dict.admin.minimalOpt}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--vpl-border-gold)] bg-[var(--vpl-bg-card)] text-xs font-medium text-[var(--vpl-accent)] hover:bg-[var(--vpl-accent)] hover:text-[var(--vpl-accent-text-on-fill)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showImport ? dict.admin.hideImport : dict.admin.showImport}</span>
            </button>
          </div>

          {/* Optional Incremental Import Drawer */}
          {showImport && (
            <form
              onSubmit={handleImportSubmit}
              className="p-4 rounded-lg bg-[var(--vpl-bg-inset)] border border-[var(--vpl-border-gold)] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
                  {dict.admin.importBanner}
                </span>
                <span className="text-[11px] text-[var(--vpl-text-muted)]">
                  {dict.admin.importSubBanner}
                </span>
              </div>
              <textarea
                dir="ltr"
                rows={7}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                aria-label={dict.admin.importTextareaAria}
                className="w-full p-3 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-strong)] font-mono text-xs text-[var(--vpl-text)] focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)]"
              />
              {importError && <p className="text-xs text-[var(--vpl-danger)]">{importError}</p>}
              {importResult && (
                <p className="text-xs text-[var(--vpl-success)]">
                  {t('admin.importSuccess', {
                    added: formatNumber(importResult.added),
                    duplicates: formatNumber(importResult.duplicates),
                    failed: formatNumber(importResult.failed),
                    total: formatNumber(importResult.stats.totalPerfumes),
                  })}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 rounded-lg bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-xs font-semibold hover:bg-[var(--vpl-accent-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {importing ? dict.admin.importing : dict.admin.importSubmit}
                </button>
              </div>
            </form>
          )}

          {/* Paginated Table */}
          <div className="rounded-lg border border-[var(--vpl-border)] overflow-hidden bg-[var(--vpl-bg-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-[var(--vpl-bg-elevated)] text-[var(--vpl-text-muted)] font-mono uppercase text-[11px] border-b border-[var(--vpl-border)]">
                  <tr>
                    <th className="py-2.5 px-4 text-start">{dict.admin.colPerfumeHouse}</th>
                    <th className="py-2.5 px-3 text-start">{dict.admin.colGender}</th>
                    <th className="py-2.5 px-4 text-start">{dict.admin.colFamily}</th>
                    <th className="py-2.5 px-4 text-start">{dict.admin.colNotes}</th>
                    <th className="py-2.5 px-4 text-start">{dict.admin.colCompleteness}</th>
                    <th className="py-2.5 px-4 text-end">{dict.admin.colSource}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vpl-border-subtle)]">
                  {loading && !data ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--vpl-text-muted)]">
                        {dict.admin.loadingRows}
                      </td>
                    </tr>
                  ) : data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--vpl-text-muted)]">
                        {dict.admin.emptyRows}
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((item) => {
                      const compText =
                        item.completeness === 'complete' ||
                        item.completeness === 'partial' ||
                        item.completeness === 'minimal'
                          ? dict.reveal.completeness[item.completeness]
                          : item.completeness;

                      return (
                        <tr key={item.id} className="hover:bg-[var(--vpl-bg-elevated)]/60">
                          <td className="py-3 px-4">
                            <div dir="ltr" className="font-medium text-[var(--vpl-text)] text-start">
                              {item.name}
                            </div>
                            <div
                              dir="ltr"
                              className="text-[11px] text-[var(--vpl-text-muted)] text-start"
                            >
                              {item.house}
                              {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                              {item.concentration ? ` · ${item.concentration}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded border border-[var(--vpl-border)] bg-[var(--vpl-bg-subtle)] text-[10px] font-mono text-[var(--vpl-text-secondary)] whitespace-nowrap">
                              {getLocalizedGender(locale, item.gender)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[var(--vpl-text-body)]">{item.family}</td>
                          <td className="py-3 px-4 text-[var(--vpl-text-body)] max-w-xs truncate">
                            {item.allNoteNames
                              .slice(0, 6)
                              .map((n) => getNoteName(n))
                              .join('، ')}
                            {item.allNoteNames.length > 6
                              ? ` +${formatNumber(item.allNoteNames.length - 6)}`
                              : ''}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[var(--vpl-accent)]">
                            {compText}
                          </td>
                          <td className="py-3 px-4 text-end">
                            <a
                              href={item.provenance.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--vpl-accent)] hover:underline"
                            >
                              <span>{item.provenance.license}</span>
                              <ExternalLink
                                className="w-3 h-3 rtl:-scale-x-100"
                                aria-hidden="true"
                              />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {data && (
              <div className="px-4 py-3 border-t border-[var(--vpl-border)] bg-[var(--vpl-bg-elevated)] flex items-center justify-between text-xs text-[var(--vpl-text-muted)]">
                <span className="tabular-nums">
                  {t('admin.showingRange', {
                    start: formatNumber(
                      (data.page - 1) * data.limit + (data.items.length > 0 ? 1 : 0)
                    ),
                    end: formatNumber((data.page - 1) * data.limit + data.items.length),
                    total: formatNumber(data.totalFiltered),
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={dict.admin.prevPageAria}
                    className="p-1.5 rounded border border-[var(--vpl-border-strong)] text-[var(--vpl-text-secondary)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                  <span className="font-mono tabular-nums">
                    {formatNumber(page)} / {formatNumber(totalPages)}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label={dict.admin.nextPageAria}
                    className="p-1.5 rounded border border-[var(--vpl-border-strong)] text-[var(--vpl-text-secondary)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

