import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type { BalanceReport, NormalizedNoteEntry } from '../types/fragrance';

interface PerfumeVesselProps {
  balance: BalanceReport;
  entries: NormalizedNoteEntry[];
}

export const PerfumeVessel: React.FC<PerfumeVesselProps> = ({ balance }) => {
  const { dict, formatNumber, getAccordLabel, getFamilyLabel, getNoteCopy, t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const appearance = balance.liquidAppearance;
  const fillPercent =
    appearance?.fillPercent ??
    (balance.totalDrops === 0
      ? 0
      : Math.min(92, Math.max(16, (balance.totalDrops / 24) * 84 + 10)));

  const interiorBottom = 236;
  const interiorHeight = 144;
  const liquidHeight = (interiorHeight * fillPercent) / 100;
  const liquidY = interiorBottom - liquidHeight;

  const liquidColor = appearance?.liquidColorHex ?? balance.blendedColorHex ?? '#D4AF6E';
  const deepColor = appearance?.deepColorHex ?? liquidColor;
  const meniscusColor = appearance?.meniscusColorHex ?? '#F7EBD2';
  const liquidOpacity = appearance?.effectiveOpacity ?? 0.85;

  const glassStroke = isLight ? 'rgba(139, 99, 36, 0.58)' : 'rgba(212, 175, 110, 0.48)';
  const tickStroke = isLight ? 'rgba(62, 50, 35, 0.35)' : 'rgba(244, 239, 230, 0.35)';

  return (
    <div
      className="p-4 rounded-xl bg-[var(--vpl-bg-subtle)] border border-[var(--vpl-border)] space-y-3"
      data-testid="perfume-vessel"
      data-drops={balance.totalDrops}
      data-liquid-hex={liquidColor}
    >
      <div className="flex items-center gap-5">
        <div className="relative w-[136px] h-[184px] shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 220 264"
            className="w-full h-full"
            role="img"
            aria-label={
              balance.totalDrops === 0
                ? dict.lab.vesselEmptyAria
                : t('lab.vesselFilledAria', {
                    percent: formatNumber(Math.round(fillPercent)),
                    drops: formatNumber(balance.totalDrops),
                  })
            }
          >
            <defs>
              <clipPath id="vessel-interior-clip">
                <path d="M88 64 L132 64 L132 88 C158 100 176 124 176 156 L176 214 C176 228 164 240 150 240 L70 240 C56 240 44 228 44 214 L44 156 C44 124 62 100 88 88 Z" />
              </clipPath>
              <linearGradient id="vessel-liquid-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={liquidColor} stopOpacity={Math.min(0.95, liquidOpacity + 0.06)} />
                <stop offset="55%" stopColor={liquidColor} stopOpacity={liquidOpacity} />
                <stop offset="100%" stopColor={deepColor} stopOpacity={Math.min(0.98, liquidOpacity + 0.12)} />
              </linearGradient>
              <linearGradient id="glass-sheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity={isLight ? '0.45' : '0.16'} />
                <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.02" />
                <stop offset="85%" stopColor="#FFFFFF" stopOpacity={isLight ? '0.25' : '0.08'} />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Classic Flacon Brass Cap & Collar */}
            <g aria-hidden="true">
              <rect x="92" y="28" width="36" height="28" rx="4" fill="#B6904E" />
              <rect x="86" y="56" width="48" height="8" rx="2.5" fill="#C9A25E" opacity="0.92" />
            </g>

            {/* Glass Interior Background */}
            <path
              d="M88 64 L132 64 L132 88 C158 100 176 124 176 156 L176 214 C176 228 164 240 150 240 L70 240 C56 240 44 228 44 214 L44 156 C44 124 62 100 88 88 Z"
              fill="var(--vpl-bg-vessel)"
            />

            {/* Dynamic Beer–Lambert Liquid Column */}
            <g clipPath="url(#vessel-interior-clip)">
              {balance.totalDrops > 0 && (
                <>
                  <rect
                    x="38"
                    y={liquidY}
                    width="144"
                    height={liquidHeight + 12}
                    fill="url(#vessel-liquid-grad)"
                    style={{ transition: 'y 280ms ease-out, height 280ms ease-out, fill 320ms ease' }}
                  />
                  {/* Surface Meniscus */}
                  <ellipse
                    cx="110"
                    cy={liquidY}
                    rx="66"
                    ry="4.2"
                    fill={meniscusColor}
                    opacity={isLight ? '0.62' : '0.45'}
                  />
                  <circle
                    cx="88"
                    cy={Math.min(228, liquidY + liquidHeight * 0.65)}
                    r="2.4"
                    fill="#FFF7E2"
                    className="vessel-bubble"
                  />
                  <circle
                    cx="126"
                    cy={Math.min(228, liquidY + liquidHeight * 0.78)}
                    r="1.8"
                    fill="#FFF7E2"
                    className="vessel-bubble"
                    style={{ animationDelay: '1.3s' }}
                  />
                  <circle
                    cx="106"
                    cy={Math.min(228, liquidY + liquidHeight * 0.5)}
                    r="2"
                    fill="#FFF7E2"
                    className="vessel-bubble"
                    style={{ animationDelay: '2.2s' }}
                  />
                </>
              )}
            </g>

            {/* Glass Sheen & Graduation Ticks */}
            <path
              d="M88 64 L132 64 L132 88 C158 100 176 124 176 156 L176 214 C176 228 164 240 150 240 L70 240 C56 240 44 228 44 214 L44 156 C44 124 62 100 88 88 Z"
              fill="url(#glass-sheen)"
              stroke={glassStroke}
              strokeWidth="2"
            />
            <line x1="154" y1="130" x2="168" y2="130" stroke={tickStroke} strokeWidth="1.5" />
            <line x1="158" y1="162" x2="168" y2="162" stroke={tickStroke} strokeWidth="1.5" />
            <line x1="154" y1="194" x2="168" y2="194" stroke={tickStroke} strokeWidth="1.5" />
            <line x1="158" y1="222" x2="168" y2="222" stroke={tickStroke} strokeWidth="1.5" />
          </svg>
        </div>

        {/* Quantitative Vessel Telemetry */}
        <div className="flex-1 min-w-0 space-y-3 text-start">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--vpl-text-muted)]">
              {dict.lab.vesselVolumeLabel}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl font-semibold text-[var(--vpl-text)] tabular-nums">
                {formatNumber(balance.totalDrops)}
              </span>
              <span className="text-xs font-mono text-[var(--vpl-text-muted)] uppercase">
                {balance.totalDrops === 1 ? dict.lab.dropSingular : dict.lab.dropPlural} ·{' '}
                {formatNumber(balance.noteCount)}{' '}
                {balance.noteCount === 1 ? dict.lab.noteSingular : dict.lab.notePlural}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[var(--vpl-border)]">
            <div>
              <div className="text-[11px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.lab.familyLabel}
              </div>
              <div className="text-sm font-medium text-[var(--vpl-text)] truncate mt-0.5">
                {balance.dominantFamily
                  ? getFamilyLabel(balance.dominantFamily)
                  : dict.lab.unassignedFamily}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-[var(--vpl-text-muted)]">
                {dict.lab.essenceHueLabel}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="w-3.5 h-3.5 rounded-sm border border-[var(--vpl-border-strong)] shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: liquidColor }}
                  aria-hidden="true"
                />
                <span dir="ltr" className="text-xs font-mono text-[var(--vpl-text-secondary)] tabular-nums">
                  {liquidColor}
                </span>
              </div>
              {appearance && balance.totalDrops > 0 && (
                <div className="text-[10px] font-mono text-[var(--vpl-text-subtle)] mt-0.5 tabular-nums">
                  {t('lab.opticalDensityLabel', {
                    value: formatNumber(appearance.opticalDensity, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }),
                  })}
                </div>
              )}
            </div>
          </div>

          {balance.dominantAccords.length > 0 && (
            <div className="pt-2 border-t border-[var(--vpl-border)] text-xs text-[var(--vpl-text-body)] truncate">
              <span className="text-[var(--vpl-text-muted)] me-1.5">{dict.lab.accordsLabel}</span>
              {balance.dominantAccords.map((a) => getAccordLabel(a.accord)).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Optical Provenance Disclosure */}
      {appearance && appearance.materialCount > 0 && (
        <div className="pt-2 border-t border-[var(--vpl-border-subtle)] text-[11px] text-[var(--vpl-text-muted)] leading-relaxed">
          <span className="font-mono uppercase text-[10px] text-[var(--vpl-accent)] me-1.5">
            {dict.lab.colorProvenanceTitle}:
          </span>
          {t('lab.colorProvenanceDetail', {
            total: formatNumber(appearance.materialCount),
            documented: formatNumber(appearance.documentedCount),
            variable: formatNumber(appearance.variableCount),
            estimated: formatNumber(appearance.estimatedCount),
          })}
        </div>
      )}
    </div>
  );
};
