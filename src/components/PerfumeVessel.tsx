import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type { BalanceReport, NormalizedNoteEntry } from '../types/fragrance';

interface PerfumeVesselProps {
  balance: BalanceReport;
  entries: NormalizedNoteEntry[];
  onQuickPulse?: boolean;
}

export const PerfumeVessel: React.FC<PerfumeVesselProps> = ({ balance }) => {
  const { dict, formatNumber, getAccordLabel, getFamilyLabel, t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Scale fill level smoothly from 0% (0 drops) to 92% (24+ drops)
  const fillPercent =
    balance.totalDrops === 0 ? 0 : Math.min(92, Math.max(16, (balance.totalDrops / 24) * 84 + 10));

  const interiorBottom = 228;
  const interiorHeight = 142;
  const liquidHeight = (interiorHeight * fillPercent) / 100;
  const liquidY = interiorBottom - liquidHeight;

  const liquidColor = balance.blendedColorHex || '#D4AF6E';
  const glassStroke = isLight ? 'rgba(139, 99, 36, 0.55)' : 'rgba(212, 175, 110, 0.45)';
  const tickStroke = isLight ? 'rgba(62, 50, 35, 0.35)' : 'rgba(244, 239, 230, 0.35)';

  return (
    <div
      className="flex items-center gap-5 p-4 rounded-xl bg-[var(--vpl-bg-subtle)] border border-[var(--vpl-border)]"
      data-testid="perfume-vessel"
      data-drops={balance.totalDrops}
    >
      <div className="relative w-[132px] h-[168px] shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 220 260"
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
              <path d="M88 52 L132 52 L132 76 C158 88 176 112 176 144 L176 206 C176 220 164 232 150 232 L70 232 C56 232 44 220 44 206 L44 144 C44 112 62 88 88 76 Z" />
            </clipPath>
            <linearGradient id="vessel-liquid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.90" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="0.56" />
            </linearGradient>
            <linearGradient id="glass-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity={isLight ? '0.45' : '0.16'} />
              <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.02" />
              <stop offset="85%" stopColor="#FFFFFF" stopOpacity={isLight ? '0.25' : '0.08'} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Brass Stopper */}
          <rect x="92" y="16" width="36" height="22" rx="4" fill="#B6904E" />
          <rect x="84" y="36" width="52" height="10" rx="3" fill="#D4AF6E" />
          <rect x="94" y="20" width="8" height="14" rx="2" fill="#F0D79D" opacity="0.45" />

          {/* Glass Interior Background */}
          <path
            d="M88 52 L132 52 L132 76 C158 88 176 112 176 144 L176 206 C176 220 164 232 150 232 L70 232 C56 232 44 220 44 206 L44 144 C44 112 62 88 88 76 Z"
            fill="var(--vpl-bg-vessel)"
          />

          {/* Dynamic Liquid Level */}
          <g clipPath="url(#vessel-interior-clip)">
            {balance.totalDrops > 0 && (
              <>
                <rect
                  x="38"
                  y={liquidY}
                  width="144"
                  height={liquidHeight + 12}
                  fill="url(#vessel-liquid-grad)"
                  style={{ transition: 'y 280ms ease-out, height 280ms ease-out' }}
                />
                <ellipse
                  cx="110"
                  cy={liquidY}
                  rx="66"
                  ry="4"
                  fill="#F7EBD2"
                  opacity={isLight ? '0.5' : '0.35'}
                />
                <circle
                  cx="88"
                  cy={Math.min(220, liquidY + liquidHeight * 0.65)}
                  r="2.4"
                  fill="#FFF7E2"
                  className="vessel-bubble"
                />
                <circle
                  cx="126"
                  cy={Math.min(220, liquidY + liquidHeight * 0.78)}
                  r="1.8"
                  fill="#FFF7E2"
                  className="vessel-bubble"
                  style={{ animationDelay: '1.3s' }}
                />
                <circle
                  cx="106"
                  cy={Math.min(220, liquidY + liquidHeight * 0.5)}
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
            d="M88 52 L132 52 L132 76 C158 88 176 112 176 144 L176 206 C176 220 164 232 150 232 L70 232 C56 232 44 220 44 206 L44 144 C44 112 62 88 88 76 Z"
            fill="url(#glass-sheen)"
            stroke={glassStroke}
            strokeWidth="2"
          />
          <line x1="154" y1="120" x2="168" y2="120" stroke={tickStroke} strokeWidth="1.5" />
          <line x1="158" y1="152" x2="168" y2="152" stroke={tickStroke} strokeWidth="1.5" />
          <line x1="154" y1="184" x2="168" y2="184" stroke={tickStroke} strokeWidth="1.5" />
          <line x1="158" y1="212" x2="168" y2="212" stroke={tickStroke} strokeWidth="1.5" />
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
                className="w-3 h-3 rounded-sm border border-[var(--vpl-border-strong)] shrink-0"
                style={{ backgroundColor: liquidColor }}
                aria-hidden="true"
              />
              <span dir="ltr" className="text-xs font-mono text-[var(--vpl-text-secondary)] tabular-nums">
                {liquidColor}
              </span>
            </div>
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
  );
};
