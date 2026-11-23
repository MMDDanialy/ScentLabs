import {
  formatLocaleDate,
  formatLocaleNumber,
  getDictionary,
  getLocalizedAccord,
  getLocalizedDeterministicCritique,
  getLocalizedFamily,
  getLocalizedNoteNameByIdOrName,
  interpolate,
} from '../i18n/engineLocalization';
import type { Locale } from '../i18n/types';
import type { ResolvedTheme } from '../theme/ThemeContext';
import type { PassportData } from '../types/fragrance';

class AtelierAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled = false;

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.playDrop(580);
    }
  }

  public playDrop(pitchHz = 520): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitchHz, now);
    osc.frequency.exponentialRampToValueAtTime(pitchHz * 1.35, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playRevealChord(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [293.66, 369.99, 440, 587.33];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.025, now + idx * 0.05 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.95);
    });
  }
}

export const atelierAudio = new AtelierAudioEngine();

export function formatPassportSummary(passport: PassportData, locale: Locale = 'en'): string {
  const dict = getDictionary(locale);
  const exp = dict.passportExport;
  const n = (v: number) => formatLocaleNumber(locale, v);
  const pct = (v: number) => `${formatLocaleNumber(locale, v)}${locale === 'fa' ? '٪' : '%'}`;

  const layerList = (layer: 'top' | 'heart' | 'base') =>
    passport.entries
      .filter((e) => e.note.layer === layer)
      .map((e) => `${getLocalizedNoteNameByIdOrName(locale, e.note.id)} (${pct(e.percentage)})`)
      .join(locale === 'fa' ? '، ' : ', ');

  const top = layerList('top') || dict.reveal.noneLabel;
  const heart = layerList('heart') || dict.reveal.noneLabel;
  const base = layerList('base') || dict.reveal.noneLabel;
  const match = passport.topMatches[0];
  const famLabel = passport.balance.dominantFamily
    ? getLocalizedFamily(locale, passport.balance.dominantFamily)
    : dict.library.bespoke;
  const dateStr = formatLocaleDate(locale, passport.createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return [
    exp.summaryTitle,
    interpolate(exp.summaryAlchemist, {
      title: passport.fragranceName || dict.reveal.untitledComposition,
    }),
    interpolate(exp.summaryFormula, {
      alchemist: passport.alchemistName || dict.reveal.defaultAlchemist,
      code: passport.formulaCode,
    }),
    interpolate(exp.summaryCreated, { date: dateStr }),
    interpolate(exp.summaryFamily, {
      family: famLabel,
      top: n(passport.balance.pyramid.top),
      heart: n(passport.balance.pyramid.heart),
      base: n(passport.balance.pyramid.base),
    }),
    interpolate(exp.summaryPyramid, { top, heart, base }),
    match
      ? interpolate(exp.summaryClosest, {
          name: match.perfume.name,
          house: match.perfume.house,
          score: n(match.similarityScore),
          confidence: n(match.confidenceScore ?? 80),
        })
      : '',
    exp.summaryNote,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function copyPassportSummary(
  passport: PassportData,
  locale: Locale = 'en'
): Promise<boolean> {
  const text = formatPassportSummary(passport, locale);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      linesDrawn += 1;
      if (linesDrawn >= maxLines - 1) {
        const remaining = [line, ...words.slice(i + 1)].join(' ');
        let truncated = remaining;
        while (ctx.measureText(`${truncated}...`).width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(remaining === truncated ? truncated : `${truncated}...`, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function loadBrandSymbolImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/virtual_perfume_lab_symbol_transparent.png';
  });
}

export async function exportPassportToPng(
  passport: PassportData,
  locale: Locale = 'en',
  theme: ResolvedTheme = 'dark'
): Promise<boolean> {
  try {
    const width = 1200;
    const height = 1600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const isRtl = locale === 'fa';
    const isLight = theme === 'light';
    const dict = getDictionary(locale);
    const exp = dict.passportExport;
    const n = (v: number) => formatLocaleNumber(locale, v);
    const pct = (v: number) => `${n(v)}${isRtl ? '٪' : '%'}`;

    const palette = isLight
      ? {
          bg: '#F6F1E7',
          cardBg: '#FCF9F2',
          text: '#1E1913',
          textSecondary: '#4A3F32',
          textMuted: '#655848',
          accent: '#8B6324',
          borderOuter: 'rgba(139, 99, 36, 0.42)',
          borderInner: 'rgba(139, 99, 36, 0.20)',
          swatchBorder: 'rgba(30, 25, 19, 0.25)',
        }
      : {
          bg: '#0A0908',
          cardBg: '#151311',
          text: '#F4EFE6',
          textSecondary: '#D7CFC2',
          textMuted: '#A89F91',
          accent: '#D4AF6E',
          borderOuter: 'rgba(212, 175, 110, 0.36)',
          borderInner: 'rgba(212, 175, 110, 0.14)',
          swatchBorder: 'rgba(244, 239, 230, 0.35)',
        };

    const brandSymbol = await loadBrandSymbolImage();

    // Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createRadialGradient(600, 320, 40, 600, 320, 520);
    grad.addColorStop(0, `${passport.balance.blendedColorHex}24`);
    grad.addColorStop(1, isLight ? 'rgba(246, 241, 231, 0)' : 'rgba(10, 9, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Outer double border
    ctx.strokeStyle = palette.borderOuter;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    ctx.strokeStyle = palette.borderInner;
    ctx.lineWidth = 1;
    ctx.strokeRect(64, 64, width - 128, height - 128);

    const sansFont = isRtl
      ? '"Vazirmatn", "Plus Jakarta Sans", sans-serif'
      : '"Plus Jakarta Sans", sans-serif';
    const serifFont = isRtl
      ? '"Vazirmatn", "Cormorant Garamond", Georgia, serif'
      : '"Cormorant Garamond", Georgia, serif';
    const monoFont = isRtl
      ? '"Vazirmatn", "JetBrains Mono", monospace'
      : '"JetBrains Mono", monospace';

    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';

    const marginX = 104;
    const anchorX = isRtl ? width - marginX : marginX;
    const textStartX = brandSymbol
      ? isRtl
        ? width - 206
        : 206
      : anchorX;

    if (brandSymbol) {
      const targetSize = 84;
      const ratio = brandSymbol.naturalWidth / Math.max(1, brandSymbol.naturalHeight);
      const drawW = ratio >= 1 ? targetSize : targetSize * ratio;
      const drawH = ratio >= 1 ? targetSize / ratio : targetSize;
      const imgX = isRtl ? width - 102 - drawW : 102;
      if (isLight) {
        ctx.fillStyle = '#14110D';
        ctx.beginPath();
        ctx.roundRect(imgX - 6, 86, drawW + 12, drawH + 12, 12);
        ctx.fill();
      }
      ctx.drawImage(brandSymbol, imgX, 92, drawW, drawH);
    }

    // Top kicker
    ctx.fillStyle = palette.accent;
    ctx.font = `500 20px ${monoFont}`;
    ctx.fillText(exp.header, textStartX, 126);

    ctx.fillStyle = palette.textMuted;
    ctx.font = `400 20px ${monoFont}`;
    const dateStr = formatLocaleDate(locale, passport.createdAt, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const dateMetaLine = isRtl
      ? `\u200F${dateStr}  ·  \u200E${passport.formulaCode}\u200E`
      : `${passport.formulaCode}  ·  ${dateStr}`;
    ctx.fillText(dateMetaLine, textStartX, 162);

    // Divider
    ctx.strokeStyle = palette.borderInner;
    ctx.beginPath();
    ctx.moveTo(104, 198);
    ctx.lineTo(width - 104, 198);
    ctx.stroke();

    // Title
    ctx.fillStyle = palette.text;
    ctx.font = `600 68px ${serifFont}`;
    const titleEndY = wrapCanvasText(
      ctx,
      passport.fragranceName || dict.reveal.untitledComposition,
      anchorX,
      284,
      width - 300,
      82,
      2
    );

    // Swatch orb on opposite trailing side
    const orbX = isRtl ? 160 : width - 160;
    ctx.beginPath();
    ctx.arc(orbX, 276, 46, 0, Math.PI * 2);
    ctx.fillStyle = passport.balance.blendedColorHex;
    ctx.fill();
    ctx.strokeStyle = palette.swatchBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Alchemist + family metadata
    const famLabel = passport.balance.dominantFamily
      ? getLocalizedFamily(locale, passport.balance.dominantFamily)
      : dict.library.bespoke;
    const alchemist = passport.alchemistName || dict.reveal.defaultAlchemist;
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `500 24px ${sansFont}`;
    ctx.fillText(
      isRtl
        ? `${dict.reveal.composedBy} ${alchemist}  ·  ${interpolate(dict.reveal.familySuffix, { family: famLabel })}`
        : `${dict.reveal.composedBy} ${alchemist}  ·  ${interpolate(dict.reveal.familySuffix, { family: famLabel })}`,
      anchorX,
      titleEndY + 12
    );

    // Pyramid section
    const pyrY = titleEndY + 86;
    ctx.fillStyle = palette.accent;
    ctx.font = `500 18px ${monoFont}`;
    ctx.fillText(exp.pyramidCaption, anchorX, pyrY);

    const barX = 104;
    const barY = pyrY + 26;
    const barW = width - 208;
    const barH = 18;
    const topW = (barW * passport.balance.pyramid.top) / 100;
    const heartW = (barW * passport.balance.pyramid.heart) / 100;
    const baseW = Math.max(0, barW - topW - heartW);

    if (isRtl) {
      ctx.fillStyle = '#E8C967';
      ctx.fillRect(barX + barW - topW, barY, topW, barH);
      ctx.fillStyle = '#C86472';
      ctx.fillRect(barX + barW - topW - heartW, barY, heartW, barH);
      ctx.fillStyle = '#9C734B';
      ctx.fillRect(barX, barY, baseW, barH);
    } else {
      ctx.fillStyle = '#E8C967';
      ctx.fillRect(barX, barY, topW, barH);
      ctx.fillStyle = '#C86472';
      ctx.fillRect(barX + topW, barY, heartW, barH);
      ctx.fillStyle = '#9C734B';
      ctx.fillRect(barX + topW + heartW, barY, baseW, barH);
    }

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `500 20px ${monoFont}`;
    ctx.fillText(
      `${dict.domain.layers.top} ${pct(passport.balance.pyramid.top)}    ·    ${dict.domain.layers.heart} ${pct(passport.balance.pyramid.heart)}    ·    ${dict.domain.layers.base} ${pct(passport.balance.pyramid.base)}`,
      anchorX,
      barY + 54
    );

    // Notes list by layer
    let cursorY = barY + 114;
    const layers: { key: 'top' | 'heart' | 'base'; label: string }[] = [
      { key: 'top', label: exp.topLabel },
      { key: 'heart', label: exp.heartLabel },
      { key: 'base', label: exp.baseLabel },
    ];

    for (const layer of layers) {
      const items = passport.entries.filter((e) => e.note.layer === layer.key);
      ctx.fillStyle = palette.accent;
      ctx.font = `500 17px ${monoFont}`;
      ctx.fillText(layer.label, anchorX, cursorY);

      ctx.fillStyle = palette.text;
      ctx.font = `400 23px ${sansFont}`;
      const line =
        items.length > 0
          ? items
              .map(
                (i) =>
                  `${getLocalizedNoteNameByIdOrName(locale, i.note.id)} (${pct(i.percentage)})`
              )
              .join('  ·  ')
          : exp.noneIncluded;
      cursorY = wrapCanvasText(ctx, line, anchorX, cursorY + 34, width - 208, 32, 2);
      cursorY += 18;
    }

    // Closest reference match box
    const matchY = Math.max(cursorY + 20, 1030);
    ctx.fillStyle = palette.cardBg;
    ctx.fillRect(104, matchY, width - 208, 220);
    ctx.strokeStyle = palette.borderOuter;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(104, matchY, width - 208, 220);

    const topMatch = passport.topMatches[0];
    const boxAnchorX = isRtl ? width - 136 : 136;
    const scoreAnchorX = isRtl ? 196 : width - 220;

    ctx.fillStyle = palette.accent;
    ctx.font = `500 17px ${monoFont}`;
    ctx.fillText(exp.similarityEstimateHeader, boxAnchorX, matchY + 44);

    if (topMatch) {
      ctx.fillStyle = palette.text;
      ctx.font = `600 36px ${serifFont}`;
      ctx.fillText(
        `${topMatch.perfume.name} — ${topMatch.perfume.house}`,
        boxAnchorX,
        matchY + 96
      );

      ctx.fillStyle = palette.accent;
      ctx.font = `600 36px ${monoFont}`;
      ctx.fillText(pct(topMatch.similarityScore), scoreAnchorX, matchY + 96);

      ctx.fillStyle = palette.textSecondary;
      ctx.font = `400 20px ${sansFont}`;
      const sharedItems = topMatch.sharedNotes
        .map((sn) => getLocalizedNoteNameByIdOrName(locale, sn))
        .join(isRtl ? '، ' : ', ');
      const sharedAccords = topMatch.sharedAccords
        .map((sa) => getLocalizedAccord(locale, sa))
        .join(isRtl ? '، ' : ', ');
      const sharedLine =
        topMatch.sharedNotes.length > 0
          ? interpolate(exp.sharedNotesPrefix, { items: sharedItems })
          : interpolate(exp.sharedAccordsPrefix, {
              items: sharedAccords || dict.reveal.accordsFallback,
            });
      wrapCanvasText(ctx, sharedLine, boxAnchorX, matchY + 144, width - 272, 28, 2);
    }

    // Editorial note
    const critY = matchY + 266;
    ctx.fillStyle = palette.accent;
    ctx.font = `500 17px ${monoFont}`;
    ctx.fillText(exp.archiveNoteHeader, anchorX, critY);

    const displayCritique =
      passport.critiqueSource === 'deterministic'
        ? getLocalizedDeterministicCritique(
            locale,
            passport.fragranceName,
            passport.entries,
            passport.balance,
            passport.topMatches[0] ?? null
          )
        : passport.editorialCritique;

    ctx.fillStyle = palette.textSecondary;
    ctx.font = `400 21px ${sansFont}`;
    wrapCanvasText(ctx, displayCritique, anchorX, critY + 36, width - 208, 32, 4);

    // Honest footer disclaimer
    ctx.strokeStyle = palette.borderInner;
    ctx.beginPath();
    ctx.moveTo(104, height - 130);
    ctx.lineTo(width - 104, height - 130);
    ctx.stroke();

    ctx.fillStyle = palette.textMuted;
    ctx.font = `400 17px ${sansFont}`;
    ctx.fillText(exp.footerDisclaimer, anchorX, height - 92);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeName = (passport.fragranceName || 'virtual-fragrance')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    link.download = `${safeName || 'fragrance'}-${passport.formulaCode.toLowerCase()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
    }, 150);
    return true;
  } catch {
    return false;
  }
}
