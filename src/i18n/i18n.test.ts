import assert from 'node:assert/strict';
import test from 'node:test';
import { ATELIER_PRESETS, FRAGRANCE_NOTES, OLFACTORY_FAMILIES } from '../data/catalog';
import { computeBalanceReport, normalizeBlend } from '../engine/formulationEngine';
import { en } from './en';
import { fa } from './fa';
import {
  formatLocaleDate,
  formatLocaleNumber,
  getLocalizedBalanceSummary,
  getLocalizedCompositionTitle,
  getLocalizedDeterministicCritique,
  getLocalizedDiagnostic,
  getLocalizedFamily,
  getLocalizedNote,
  getLocalizedPreset,
  resolveMessage,
} from './engineLocalization';

function collectLeafPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (Array.isArray(obj)) {
    return obj.length > 0 ? [prefix] : [];
  }
  if (!obj || typeof obj !== 'object') return [];
  const paths: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    paths.push(...collectLeafPaths(v, next));
  }
  return paths;
}

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === 'object' && seg in acc) {
      return (acc as Record<string, unknown>)[seg];
    }
    return undefined;
  }, obj);
}

test('EN and FA translation dictionaries have complete structural parity and non-empty strings', () => {
  // Check top-level UI sections (excluding dynamic empty accords map on en)
  const uiPaths = collectLeafPaths({ ...en, domain: { ...en.domain, accords: {} } }).filter(
    (p) => !p.startsWith('domain.accords')
  );

  for (const path of uiPaths) {
    const faVal = getAtPath(fa, path);
    assert.ok(faVal !== undefined, `Missing Persian translation at path: ${path}`);
    if (typeof faVal === 'string') {
      assert.ok(faVal.trim().length > 0, `Empty Persian string at path: ${path}`);
    } else if (Array.isArray(faVal)) {
      assert.ok(faVal.length > 0, `Empty Persian array at path: ${path}`);
    }
  }
});

test('All 27 fragrance notes, 4 presets, and 8 olfactory families are localized in Persian', () => {
  assert.equal(FRAGRANCE_NOTES.length, 27);
  for (const note of FRAGRANCE_NOTES) {
    const loc = getLocalizedNote('fa', note);
    assert.ok(loc.name.length > 0 && loc.name !== note.name, `Note ${note.id} should have Persian name`);
    assert.ok(
      loc.description.length > 0 && loc.description !== note.description,
      `Note ${note.id} should have Persian description`
    );
    assert.ok(loc.accords.length > 0, `Note ${note.id} should have localized accords`);
  }

  for (const preset of ATELIER_PRESETS) {
    const pLoc = getLocalizedPreset('fa', preset.id);
    assert.ok(pLoc.name !== preset.name, `Preset ${preset.id} should have Persian name`);
    assert.ok(pLoc.subtitle.length > 0, `Preset ${preset.id} should have subtitle`);
  }

  for (const fam of OLFACTORY_FAMILIES) {
    const fLoc = getLocalizedFamily('fa', fam);
    assert.ok(fLoc !== fam, `Family ${fam} should be localized in Persian`);
  }
});

test('resolveMessage handles interpolation and safe English fallback', () => {
  assert.equal(resolveMessage('en', 'nav.savedLibrary', { count: 4 }), 'Saved Library · 4');
  assert.equal(resolveMessage('fa', 'nav.savedLibrary', { count: '۴' }), 'آرشیو ذخیره‌شده · ۴');
  assert.equal(resolveMessage('fa', 'nonexistent.missing.key'), 'nonexistent.missing.key');
});

test('Locale-aware number and date formatters render distinct EN and FA output', () => {
  assert.equal(formatLocaleNumber('en', 1479), '1,479');
  const faNum = formatLocaleNumber('fa', 1479);
  assert.match(faNum, /[۰-۹]/);

  const enDate = formatLocaleDate('en', '2026-04-12T10:00:00Z', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const faDate = formatLocaleDate('fa', '2026-04-12T10:00:00Z', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  assert.ok(enDate.includes('2026'));
  assert.notEqual(faDate, enDate);
});

test('Diagnostics, balance summaries, and deterministic critiques localize accurately in FA', () => {
  const selection = { bergamot: 3, 'damask-rose': 4, sandalwood: 4 };
  const entries = normalizeBlend(selection, FRAGRANCE_NOTES);
  const balance = computeBalanceReport(selection, FRAGRANCE_NOTES);

  const summaryFa = getLocalizedBalanceSummary('fa', balance);
  assert.ok(summaryFa.length > 10 && !/[a-zA-Z]{4,}/.test(summaryFa));

  for (const diag of balance.diagnostics) {
    const localized = getLocalizedDiagnostic('fa', diag, balance);
    assert.ok(localized.title.length > 0 && localized.suggestion.length > 0);
  }

  const critiqueFa = getLocalizedDeterministicCritique(
    'fa',
    'شبانه ترنج',
    entries,
    balance,
    null
  );
  assert.ok(critiqueFa.includes('شبانه ترنج'));

  const singleTierSel = { bergamot: 5, lemon: 4 };
  const singleTierEntries = normalizeBlend(singleTierSel, FRAGRANCE_NOTES);
  const singleTierBal = computeBalanceReport(singleTierSel, FRAGRANCE_NOTES);
  const singleTierDiag = singleTierBal.diagnostics.find((d) => d.id === 'single-tier');
  assert.ok(singleTierDiag);
  const locSingleTier = getLocalizedDiagnostic('fa', singleTierDiag, singleTierBal);
  assert.ok(locSingleTier.title.includes('یک لایه'));

  const faCitrusTitle = getLocalizedCompositionTitle('fa', singleTierEntries, singleTierBal);
  assert.ok(faCitrusTitle.includes('کُلن آفتابی'));
});
