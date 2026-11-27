import {
  formatLocaleDate,
  formatLocaleNumber,
  getDictionary,
  getLocalizedAccord,
  getLocalizedDeterministicCritique,
  getLocalizedFamily,
  getLocalizedGender,
  getLocalizedNoteNameByIdOrName,
  interpolate,
} from '../i18n/engineLocalization';
import type { Locale } from '../i18n/types';
import type { ResolvedTheme } from '../theme/ThemeContext';
import type { PassportData } from '../types/fragrance';

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
  const matchesList = passport.topMatches.slice(0, 3);
  const famLabel = passport.balance.dominantFamily
    ? getLocalizedFamily(locale, passport.balance.dominantFamily)
    : dict.library.bespoke;
  const dateStr = formatLocaleDate(locale, passport.createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const matchLines = matchesList.map((m, idx) => {
    const confStr =
      m.confidenceReliable && m.confidenceScore !== null
        ? interpolate(dict.reveal.confidenceLabel, { score: n(m.confidenceScore) })
        : dict.reveal.confidenceInsufficient;
    const genderStr = getLocalizedGender(locale, m.perfume.gender);
    const line = `${interpolate(exp.summaryClosest, {
      name: m.perfume.name,
      house: m.perfume.house,
      score: n(m.similarityScore),
      confidence: confStr,
    })} [${genderStr}]`;
    return matchesList.length > 1 ? `${n(idx + 1)}. ${line}` : line;
  });

  const critiqueText =
    passport.critiqueSource === 'deterministic'
      ? getLocalizedDeterministicCritique(
          locale,
          passport.fragranceName,
          passport.entries,
          passport.balance,
          passport.topMatches[0] ?? null
        )
      : passport.editorialCritique;

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
    ...matchLines,
    `${exp.archiveNoteHeader}: ${critiqueText}`,
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
    textarea.setAttribute('readonly', 'true');
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
  const paragraphs = text.split(/\n+/);
  let currentY = y;
  let linesDrawn = 0;

  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].trim().split(/\s+/).filter(Boolean);
    let line = '';

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
      linesDrawn += 1;
      if (linesDrawn >= maxLines) return currentY;
    }
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
    const height = 1660;
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

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
    const brandSymbol = await loadBrandSymbolImage();

    // Background & atmospheric liquid tint radial glow
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    const liquidHex = passport.balance.liquidAppearance?.liquidColorHex ?? passport.balance.blendedColorHex;
    const grad = ctx.createRadialGradient(600, 320, 40, 600, 320, 520);
    grad.addColorStop(0, `${liquidHex}26`);
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
    const titleText = passport.fragranceName || dict.reveal.untitledComposition;
    const prevTitleDir = ctx.direction;
    ctx.direction = isRtl && /[\u0600-\u06FF]/.test(titleText) ? 'rtl' : 'ltr';
    ctx.fillStyle = palette.text;
    ctx.font = `600 66px ${serifFont}`;
    const titleEndY = wrapCanvasText(
      ctx,
      titleText,
      anchorX,
      280,
      width - 300,
      80,
      2
    );
    ctx.direction = prevTitleDir;

    // Swatch orb with realistic liquid deep rim
    const orbX = isRtl ? 160 : width - 160;
    const orbGrad = ctx.createRadialGradient(orbX - 12, 264, 6, orbX, 276, 46);
    orbGrad.addColorStop(0, passport.balance.liquidAppearance?.meniscusColorHex ?? liquidHex);
    orbGrad.addColorStop(0.65, liquidHex);
    orbGrad.addColorStop(1, passport.balance.liquidAppearance?.deepColorHex ?? liquidHex);
    ctx.beginPath();
    ctx.arc(orbX, 276, 46, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
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
      `${dict.reveal.composedBy} ${alchemist}  ·  ${interpolate(dict.reveal.familySuffix, { family: famLabel })}`,
      anchorX,
      titleEndY + 12
    );

    // Pyramid section
    const pyrY = titleEndY + 82;
    ctx.fillStyle = palette.accent;
    ctx.font = `500 18px ${monoFont}`;
    ctx.fillText(exp.pyramidCaption, anchorX, pyrY);

    const barX = 104;
    const barY = pyrY + 24;
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
      barY + 52
    );

    // Notes list by layer
    let cursorY = barY + 108;
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
      ctx.font = `400 22px ${sansFont}`;
      const line =
        items.length > 0
          ? items
              .map(
                (i) =>
                  `${getLocalizedNoteNameByIdOrName(locale, i.note.id)} (${pct(i.percentage)})`
              )
              .join('  ·  ')
          : exp.noneIncluded;
      cursorY = wrapCanvasText(ctx, line, anchorX, cursorY + 32, width - 208, 30, 2);
      cursorY += 16;
    }

    // Closest reference match box
    const matchY = Math.min(Math.max(cursorY + 14, 930), 1020);
    ctx.fillStyle = palette.cardBg;
    ctx.fillRect(104, matchY, width - 208, 224);
    ctx.strokeStyle = palette.borderOuter;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(104, matchY, width - 208, 224);

    const topMatch = passport.topMatches[0];
    const boxAnchorX = isRtl ? width - 136 : 136;
    const scoreAnchorX = isRtl ? 196 : width - 220;

    ctx.fillStyle = palette.accent;
    ctx.font = `500 17px ${monoFont}`;
    ctx.fillText(exp.similarityEstimateHeader, boxAnchorX, matchY + 40);

    if (topMatch) {
      const matchTitleText = `${topMatch.perfume.name} — ${topMatch.perfume.house}`;
      const prevMatchDir = ctx.direction;
      ctx.direction = isRtl && /[\u0600-\u06FF]/.test(matchTitleText) ? 'rtl' : 'ltr';
      ctx.fillStyle = palette.text;
      ctx.font = `600 32px ${serifFont}`;
      wrapCanvasText(
        ctx,
        matchTitleText,
        boxAnchorX,
        matchY + 86,
        width - 420,
        38,
        1
      );
      ctx.direction = prevMatchDir;

      ctx.fillStyle = palette.accent;
      ctx.font = `600 32px ${monoFont}`;
      ctx.fillText(pct(topMatch.similarityScore), scoreAnchorX, matchY + 86);

      ctx.fillStyle = palette.textMuted;
      ctx.font = `400 18px ${sansFont}`;
      const confLine =
        topMatch.confidenceReliable && topMatch.confidenceScore !== null
          ? interpolate(dict.reveal.confidenceLabel, { score: n(topMatch.confidenceScore) })
          : dict.reveal.confidenceInsufficient;
      const metaBadges = `${getLocalizedGender(locale, topMatch.perfume.gender)}  ·  ${interpolate(dict.reveal.weightedAlignmentBadge, { score: n(topMatch.weightedNoteAlignment) })}  ·  ${confLine}`;
      ctx.fillText(metaBadges, boxAnchorX, matchY + 122);

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
      wrapCanvasText(ctx, sharedLine, boxAnchorX, matchY + 160, width - 272, 28, 2);
    }

    // Editorial note (dynamically sized to fit available space cleanly above footer divider)
    const critY = matchY + 258;
    ctx.fillStyle = palette.accent;
    ctx.font = `500 17px ${monoFont}`;
    const sourceBadge =
      passport.critiqueStatus === 'ai-live'
        ? dict.reveal.critiqueBadgeAi
        : passport.critiqueStatus === 'ai-cached'
        ? dict.reveal.critiqueBadgeAiCached
        : passport.critiqueStatus === 'deterministic-fallback'
        ? dict.reveal.critiqueBadgeFallback
        : dict.reveal.critiqueBadgeDeterministic;
    ctx.fillText(`${exp.archiveNoteHeader}  ·  ${sourceBadge}`, anchorX, critY);

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
    ctx.font = `400 19px ${sansFont}`;
    const critiqueStartY = critY + 32;
    const maxCritiqueLines = Math.max(6, Math.floor((height - 138 - critiqueStartY) / 27));
    wrapCanvasText(ctx, displayCritique, anchorX, critiqueStartY, width - 208, 27, maxCritiqueLines);

    // Honest footer disclaimer
    ctx.strokeStyle = palette.borderInner;
    ctx.beginPath();
    ctx.moveTo(104, height - 118);
    ctx.lineTo(width - 104, height - 118);
    ctx.stroke();

    ctx.fillStyle = palette.textMuted;
    ctx.font = `400 17px ${sansFont}`;
    ctx.fillText(exp.footerDisclaimer, anchorX, height - 80);

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
