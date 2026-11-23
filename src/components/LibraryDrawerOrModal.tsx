import React, { useEffect } from 'react';
import { BookOpen, Trash2, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { PassportData } from '../types/fragrance';

interface LibraryDrawerOrModalProps {
  isOpen: boolean;
  items: PassportData[];
  onClose: () => void;
  onLoadInLab: (item: PassportData) => void;
  onOpenPassport: (item: PassportData) => void;
  onDelete: (id: string) => void;
}

export const LibraryDrawerOrModal: React.FC<LibraryDrawerOrModalProps> = ({
  isOpen,
  items,
  onClose,
  onLoadInLab,
  onOpenPassport,
  onDelete,
}) => {
  const { dict, formatDate, formatNumber, getFamilyLabel, locale, t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pct = (val: number) => `${formatNumber(val)}${locale === 'fa' ? '٪' : '%'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--vpl-bg-modal)] border-s border-[var(--vpl-border-gold)] h-full flex flex-col text-start">
        <div className="px-6 py-5 border-b border-[var(--vpl-border)] flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
              {dict.library.eyebrow}
            </p>
            <h2
              id="library-drawer-title"
              className="font-serif text-2xl font-semibold text-[var(--vpl-text)]"
            >
              {t('library.title', { count: formatNumber(items.length) })}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict.library.closeAria}
            className="p-2 rounded-lg border border-[var(--vpl-border)] text-[var(--vpl-text-body)] hover:text-[var(--vpl-text)] hover:border-[var(--vpl-border-gold)] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-[var(--vpl-accent)]/70 mx-auto" aria-hidden="true" />
              <h3 className="font-serif text-xl text-[var(--vpl-text)]">
                {dict.library.emptyTitle}
              </h3>
              <p className="text-xs text-[var(--vpl-text-muted)] max-w-xs mx-auto leading-relaxed">
                {dict.library.emptyDescription}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const dateStr = formatDate(item.createdAt, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const topMatch = item.topMatches[0];
              const famLabel = item.balance.dominantFamily
                ? getFamilyLabel(item.balance.dominantFamily)
                : dict.library.bespoke;

              return (
                <article
                  key={item.id}
                  className="p-4 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-[var(--vpl-text-muted)]">
                        <span dir="ltr">{item.formulaCode}</span> · {dateStr}
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-[var(--vpl-text)] truncate mt-0.5">
                        {item.fragranceName}
                      </h3>
                      <p className="text-xs text-[var(--vpl-text-muted)] mt-0.5">
                        {item.alchemistName} · {famLabel}
                      </p>
                    </div>
                    <span
                      className="w-5 h-5 rounded-full border border-[var(--vpl-border-strong)] shrink-0 mt-1"
                      style={{ backgroundColor: item.balance.blendedColorHex }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="text-xs font-mono text-[var(--vpl-text-body)] tabular-nums">
                    {dict.domain.layers.top} {pct(item.balance.pyramid.top)} ·{' '}
                    {dict.domain.layers.heart} {pct(item.balance.pyramid.heart)} ·{' '}
                    {dict.domain.layers.base} {pct(item.balance.pyramid.base)}
                    {topMatch ? (
                      <>
                        {' · '}
                        {pct(topMatch.similarityScore)}{' '}
                        <span dir="ltr">{topMatch.perfume.name}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--vpl-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => onLoadInLab(item)}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--vpl-accent-soft)] border border-[var(--vpl-border-gold)] text-xs font-medium text-[var(--vpl-text)] hover:bg-[var(--vpl-accent)] hover:text-[var(--vpl-accent-text-on-fill)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {dict.library.loadInLab}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPassport(item)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--vpl-border)] text-xs font-medium text-[var(--vpl-text-secondary)] hover:border-[var(--vpl-border-gold)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {dict.library.viewPassport}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={t('library.deleteAria', { name: item.fragranceName })}
                      className="p-2 rounded-lg border border-[var(--vpl-border)] text-[var(--vpl-text-muted)] hover:text-[var(--vpl-danger)] hover:border-[var(--vpl-danger-border)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
