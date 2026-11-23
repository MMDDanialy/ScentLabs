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
    const freqs = [293.66, 369.99, 440, 587.33]; // D major 7th gentle shimmer
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

export function formatPassportSummary(passport: PassportData): string {
  const top = passport.entries
    .filter((e) => e.note.layer === 'top')
    .map((e) => `${e.note.name} (${e.percentage}%)`)
    .join(', ');
  const heart = passport.entries
    .filter((e) => e.note.layer === 'heart')
    .map((e) => `${e.note.name} (${e.percentage}%)`)
    .join(', ');
  const base = passport.entries
    .filter((e) => e.note.layer === 'base')
    .map((e) => `${e.note.name} (${e.percentage}%)`)
    .join(', ');
  const match = passport.topMatches[0];

  return [
    `VIRTUAL PERFUME LAB — FRAGRANCE IDENTITY PASSPORT`,
    `Title: ${passport.fragranceName}`,
    `Alchemist: ${passport.alchemistName} · Formula ID: ${passport.formulaCode}`,
    `Created: ${new Date(passport.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
    `Family: ${passport.balance.dominantFamily ?? 'Custom'} · Pyramid: ${passport.balance.pyramid.top}% Top / ${passport.balance.pyramid.heart}% Heart / ${passport.balance.pyramid.base}% Base`,
    `Top Notes: ${top || 'None'}`,
    `Heart Notes: ${heart || 'None'}`,
    `Base Notes: ${base || 'None'}`,
    match
      ? `Closest Algorithmic Reference: ${match.perfume.name} (${match.perfume.house}) — ${match.similarityScore}% internal similarity estimate`
      : '',
    `Note: Virtual creative blend shares and algorithmic similarity estimate; not a physical chemical formula or brand endorsement.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function copyPassportSummary(passport: PassportData): Promise<boolean> {
  const text = formatPassportSummary(passport);
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

export function exportPassportToPng(passport: PassportData): boolean {
  try {
    const width = 1200;
    const height = 1600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Background
    ctx.fillStyle = '#0A0908';
    ctx.fillRect(0, 0, width, height);

    // Subtle radial warmth behind vessel emblem
    const grad = ctx.createRadialGradient(600, 320, 40, 600, 320, 520);
    grad.addColorStop(0, `${passport.balance.blendedColorHex}24`);
    grad.addColorStop(1, 'rgba(10, 9, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Outer double border
    ctx.strokeStyle = 'rgba(212, 175, 110, 0.36)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    ctx.strokeStyle = 'rgba(212, 175, 110, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(64, 64, width - 128, height - 128);

    // Top kicker
    ctx.fillStyle = '#D4AF6E';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('VIRTUAL PERFUME LAB  ·  FRAGRANCE IDENTITY PASSPORT', 104, 126);

    ctx.fillStyle = '#A89F91';
    ctx.font = '400 20px "JetBrains Mono", monospace';
    const dateStr = new Date(passport.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    ctx.fillText(`${passport.formulaCode}  ·  ${dateStr}`, 104, 162);

    // Divider
    ctx.strokeStyle = 'rgba(212, 175, 110, 0.2)';
    ctx.beginPath();
    ctx.moveTo(104, 196);
    ctx.lineTo(width - 104, 196);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#F4EFE6';
    ctx.font = '600 74px "Cormorant Garamond", Georgia, serif';
    const titleEndY = wrapCanvasText(
      ctx,
      passport.fragranceName || 'Untitled Composition',
      104,
      284,
      width - 280,
      82,
      2
    );

    // Swatch orb on right
    ctx.beginPath();
    ctx.arc(width - 160, 276, 46, 0, Math.PI * 2);
    ctx.fillStyle = passport.balance.blendedColorHex;
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 239, 230, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Alchemist + family metadata
    ctx.fillStyle = '#C7BEB0';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Composed by ${passport.alchemistName}  ·  ${passport.balance.dominantFamily ?? 'Bespoke'} Family`,
      104,
      titleEndY + 12
    );

    // Pyramid section
    const pyrY = titleEndY + 86;
    ctx.fillStyle = '#D4AF6E';
    ctx.font = '500 18px "JetBrains Mono", monospace';
    ctx.fillText('OLFACTORY PYRAMID SHARES (VIRTUAL BLEND UNITS)', 104, pyrY);

    const barX = 104;
    const barY = pyrY + 26;
    const barW = width - 208;
    const barH = 18;
    const topW = (barW * passport.balance.pyramid.top) / 100;
    const heartW = (barW * passport.balance.pyramid.heart) / 100;
    const baseW = Math.max(0, barW - topW - heartW);

    ctx.fillStyle = '#E8C967';
    ctx.fillRect(barX, barY, topW, barH);
    ctx.fillStyle = '#C86472';
    ctx.fillRect(barX + topW, barY, heartW, barH);
    ctx.fillStyle = '#9C734B';
    ctx.fillRect(barX + topW + heartW, barY, baseW, barH);

    ctx.fillStyle = '#E8DFD1';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText(
      `TOP ${passport.balance.pyramid.top}%    ·    HEART ${passport.balance.pyramid.heart}%    ·    BASE ${passport.balance.pyramid.base}%`,
      104,
      barY + 54
    );

    // Notes list by layer
    let cursorY = barY + 114;
    const layers: { key: 'top' | 'heart' | 'base'; label: string }[] = [
      { key: 'top', label: 'TOP NOTES' },
      { key: 'heart', label: 'HEART NOTES' },
      { key: 'base', label: 'BASE NOTES' },
    ];

    for (const layer of layers) {
      const items = passport.entries.filter((e) => e.note.layer === layer.key);
      ctx.fillStyle = '#D4AF6E';
      ctx.font = '500 17px "JetBrains Mono", monospace';
      ctx.fillText(layer.label, 104, cursorY);

      ctx.fillStyle = '#F4EFE6';
      ctx.font = '400 23px "Plus Jakarta Sans", sans-serif';
      const line =
        items.length > 0
          ? items.map((i) => `${i.note.name} (${i.percentage}%)`).join('  ·  ')
          : 'None included';
      cursorY = wrapCanvasText(ctx, line, 104, cursorY + 34, width - 208, 32, 2);
      cursorY += 18;
    }

    // Closest reference match box
    const matchY = Math.max(cursorY + 20, 1030);
    ctx.fillStyle = '#151311';
    ctx.fillRect(104, matchY, width - 208, 220);
    ctx.strokeStyle = 'rgba(212, 175, 110, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(104, matchY, width - 208, 220);

    const topMatch = passport.topMatches[0];
    ctx.fillStyle = '#D4AF6E';
    ctx.font = '500 17px "JetBrains Mono", monospace';
    ctx.fillText('INTERNAL ALGORITHMIC SIMILARITY ESTIMATE', 136, matchY + 44);

    if (topMatch) {
      ctx.fillStyle = '#F4EFE6';
      ctx.font = '600 38px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(
        `${topMatch.perfume.name} — ${topMatch.perfume.house}`,
        136,
        matchY + 96
      );

      ctx.fillStyle = '#D4AF6E';
      ctx.font = '600 36px "JetBrains Mono", monospace';
      ctx.fillText(`${topMatch.similarityScore}%`, width - 220, matchY + 96);

      ctx.fillStyle = '#C7BEB0';
      ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
      const sharedLine =
        topMatch.sharedNotes.length > 0
          ? `Shared notes: ${topMatch.sharedNotes.join(', ')}`
          : `Shared accords: ${topMatch.sharedAccords.join(', ') || 'Facet balance'}`;
      wrapCanvasText(ctx, sharedLine, 136, matchY + 144, width - 272, 28, 2);
    }

    // Editorial note
    const critY = matchY + 266;
    ctx.fillStyle = '#D4AF6E';
    ctx.font = '500 17px "JetBrains Mono", monospace';
    ctx.fillText('ATELIER ARCHIVE NOTE', 104, critY);

    ctx.fillStyle = '#D7CFC2';
    ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
    wrapCanvasText(ctx, passport.editorialCritique, 104, critY + 36, width - 208, 30, 4);

    // Honest footer disclaimer
    ctx.strokeStyle = 'rgba(212, 175, 110, 0.18)';
    ctx.beginPath();
    ctx.moveTo(104, height - 130);
    ctx.lineTo(width - 104, height - 130);
    ctx.stroke();

    ctx.fillStyle = '#8F8679';
    ctx.font = '400 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      'Virtual creative blend composition & algorithmic similarity estimate. Not a physical chemical formula or brand endorsement.',
      104,
      height - 92
    );

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
    document.body.removeChild(link);
    return true;
  } catch {
    return false;
  }
}
