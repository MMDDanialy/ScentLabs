import React from 'react';
import type { BalanceReport, NormalizedNoteEntry } from '../types/fragrance';

interface PerfumeVesselProps {
  balance: BalanceReport;
  entries: NormalizedNoteEntry[];
  onQuickPulse?: boolean;
}

export const PerfumeVessel: React.FC<PerfumeVesselProps> = ({ balance }) => {
  // Scale fill level smoothly from 0% (0 drops) to 92% (24+ drops)
  const fillPercent =
    balance.totalDrops === 0 ? 0 : Math.min(92, Math.max(16, (balance.totalDrops / 24) * 84 + 10));

  // Liquid rectangle coordinates inside SVG flask (viewBox 0 0 220 260)
  // Vessel body interior spans y=82 to y=228 (height = 146)
  const interiorBottom = 228;
  const interiorHeight = 142;
  const liquidHeight = (interiorHeight * fillPercent) / 100;
  const liquidY = interiorBottom - liquidHeight;

  const liquidColor = balance.blendedColorHex || '#D4AF6E';

  return (
    <div
      className="flex items-center gap-5 p-4 rounded-xl bg-[#0F0E0C] border border-white/10"
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
              ? 'Empty apothecary blending vessel'
              : `Apothecary blending vessel filled to ${Math.round(fillPercent)} percent with ${balance.totalDrops} drops`
          }
        >
          <defs>
            <clipPath id="vessel-interior-clip">
              <path d="M88 52 L132 52 L132 76 C158 88 176 112 176 144 L176 206 C176 220 164 232 150 232 L70 232 C56 232 44 220 44 206 L44 144 C44 112 62 88 88 76 Z" />
            </clipPath>
            <linearGradient id="vessel-liquid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.88" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="0.52" />
            </linearGradient>
            <linearGradient id="glass-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
              <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.02" />
              <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.08" />
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
            fill="#171411"
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
                {/* Meniscus highlight */}
                <ellipse
                  cx="110"
                  cy={liquidY}
                  rx="66"
                  ry="4"
                  fill="#F7EBD2"
                  opacity="0.35"
                />
                {/* Subtle micro bubbles */}
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
            stroke="rgba(212, 175, 110, 0.45)"
            strokeWidth="2"
          />
          <line x1="154" y1="120" x2="168" y2="120" stroke="rgba(244,239,230,0.35)" strokeWidth="1.5" />
          <line x1="158" y1="152" x2="168" y2="152" stroke="rgba(244,239,230,0.28)" strokeWidth="1.5" />
          <line x1="154" y1="184" x2="168" y2="184" stroke="rgba(244,239,230,0.35)" strokeWidth="1.5" />
          <line x1="158" y1="212" x2="168" y2="212" stroke="rgba(244,239,230,0.28)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Quantitative Vessel Telemetry */}
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#9C9283]">
            Vessel Volume
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-3xl font-semibold text-[#F4EFE6] tabular-nums">
              {balance.totalDrops}
            </span>
            <span className="text-xs font-mono text-[#A89F91] uppercase">
              drops · {balance.noteCount} {balance.noteCount === 1 ? 'note' : 'notes'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/10">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#9C9283]">Family</div>
            <div className="text-sm font-medium text-[#F4EFE6] truncate mt-0.5">
              {balance.dominantFamily ?? 'Unassigned'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-[#9C9283]">Essence Hue</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="w-3 h-3 rounded-sm border border-white/25 shrink-0"
                style={{ backgroundColor: liquidColor }}
                aria-hidden="true"
              />
              <span className="text-xs font-mono text-[#E5DDD0] tabular-nums">{liquidColor}</span>
            </div>
          </div>
        </div>

        {balance.dominantAccords.length > 0 && (
          <div className="pt-2 border-t border-white/10 text-xs text-[#B9B0A2] truncate">
            <span className="text-[#9C9283] mr-1.5">Accords:</span>
            {balance.dominantAccords.map((a) => a.accord).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
};
