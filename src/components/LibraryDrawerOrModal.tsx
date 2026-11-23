import React from 'react';
import { BookOpen, Trash2, X } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-drawer-title"
    >
      <div className="w-full max-w-md bg-[#110F0D] border-l border-[#D4AF6E]/25 h-full flex flex-col">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF6E]">
              Local Archive
            </p>
            <h2 id="library-drawer-title" className="font-serif text-2xl font-semibold text-[#F4EFE6]">
              Saved Creations ({items.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved library"
            className="p-2 rounded-lg border border-white/12 text-[#C7BEB0] hover:text-[#F4EFE6] hover:border-[#D4AF6E]/50 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-[#D4AF6E]/60 mx-auto" aria-hidden="true" />
              <h3 className="font-serif text-xl text-[#F4EFE6]">Your archive is empty</h3>
              <p className="text-xs text-[#9C9283] max-w-xs mx-auto leading-relaxed">
                Compose a blend in the laboratory, reveal your fragrance, and save its Fragrance
                Identity Passport to revisit it here.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const topMatch = item.topMatches[0];

              return (
                <article
                  key={item.id}
                  className="p-4 rounded-xl bg-[#161412] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-[#9C9283]">
                        {item.formulaCode} · {dateStr}
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-[#F4EFE6] truncate mt-0.5">
                        {item.fragranceName}
                      </h3>
                      <p className="text-xs text-[#A89F91] mt-0.5">
                        {item.alchemistName} · {item.balance.dominantFamily ?? 'Bespoke'}
                      </p>
                    </div>
                    <span
                      className="w-5 h-5 rounded-full border border-white/25 shrink-0 mt-1"
                      style={{ backgroundColor: item.balance.blendedColorHex }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="text-xs font-mono text-[#B9B0A2] tabular-nums">
                    Top {item.balance.pyramid.top}% · Heart {item.balance.pyramid.heart}% · Base{' '}
                    {item.balance.pyramid.base}%
                    {topMatch ? ` · ${topMatch.similarityScore}% ${topMatch.perfume.name}` : ''}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() => onLoadInLab(item)}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#D4AF6E]/15 border border-[#D4AF6E]/40 text-xs font-medium text-[#F4EFE6] hover:bg-[#D4AF6E] hover:text-[#0A0908] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Load in Lab
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPassport(item)}
                      className="flex-1 px-3 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#E5DDD0] hover:border-[#D4AF6E]/50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View Passport
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete '${item.fragranceName}'`}
                      className="p-2 rounded-lg border border-white/10 text-[#9C9283] hover:text-rose-300 hover:border-rose-400/40 transition-colors cursor-pointer"
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
