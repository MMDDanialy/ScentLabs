import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAGRANCE_NOTES, REFERENCE_PERFUMES } from '../data/catalog';
import {
  buildScentProfile,
  computeBalanceReport,
  computeSimilarityMatches,
  generateDeterministicCritique,
  generateFormulaCode,
  normalizeBlend,
} from './formulationEngine';

test('normalizeBlend handles empty selection without NaN or division by zero', () => {
  const entries = normalizeBlend({}, FRAGRANCE_NOTES);
  assert.equal(entries.length, 0);

  const report = computeBalanceReport({}, FRAGRANCE_NOTES);
  assert.equal(report.totalDrops, 0);
  assert.equal(report.pyramid.top, 0);
  assert.equal(report.pyramid.heart, 0);
  assert.equal(report.pyramid.base, 0);
  assert.equal(report.dominantFamily, null);
});

test('normalizeBlend filters invalid IDs and normalizes percentages to 100%', () => {
  const entries = normalizeBlend(
    { bergamot: 3, rose: 4, sandalwood: 3, nonexistent: 10, lemon: 0 },
    FRAGRANCE_NOTES
  );
  assert.equal(entries.length, 3);
  const sumPct = entries.reduce((sum, e) => sum + e.percentage, 0);
  assert.equal(Math.round(sumPct), 100);
  assert.equal(entries[0].note.layer, 'top');
  assert.equal(entries[1].note.layer, 'heart');
  assert.equal(entries[2].note.layer, 'base');
});

test('computeBalanceReport flags heavy base imbalance and passes balanced blend', () => {
  const heavyReport = computeBalanceReport(
    { amber: 7, 'oud-smoke': 6, vanilla: 4 },
    FRAGRANCE_NOTES
  );
  assert.equal(heavyReport.overallStatus, 'imbalanced');
  assert.equal(heavyReport.pyramid.base, 100);
  assert.ok(heavyReport.diagnostics.some((d) => d.id === 'heavy-base' || d.id === 'low-top'));

  const balancedReport = computeBalanceReport(
    { bergamot: 3, 'pink-pepper': 1, rose: 3, cardamom: 2, sandalwood: 3, cedarwood: 2 },
    FRAGRANCE_NOTES
  );
  assert.equal(balancedReport.overallStatus, 'balanced');
  assert.equal(
    balancedReport.pyramid.top + balancedReport.pyramid.heart + balancedReport.pyramid.base,
    100
  );
});

test('computeSimilarityMatches is deterministic and ranks Santal-like blend highest for Santal 33', () => {
  const santalBlend = { cardamom: 3, iris: 3, sandalwood: 6, cedarwood: 4, musk: 2 };
  const matchesA = computeSimilarityMatches(santalBlend, FRAGRANCE_NOTES, REFERENCE_PERFUMES);
  const matchesB = computeSimilarityMatches(santalBlend, FRAGRANCE_NOTES, REFERENCE_PERFUMES);

  assert.deepEqual(matchesA, matchesB);
  assert.ok(matchesA.length >= 5);
  assert.equal(matchesA[0].perfume.id, 'ref-santal-33');
  assert.ok(matchesA[0].similarityScore >= 55 && matchesA[0].similarityScore <= 97);
  assert.ok(matchesA[0].sharedNotes.includes('Mysore Sandalwood'));
});

test('buildScentProfile selects recommended notes across all three layers', () => {
  const profile = buildScentProfile(
    ['Woody', 'Amber & Oriental'],
    'warm',
    'opulent',
    'Evening Noir',
    FRAGRANCE_NOTES
  );
  assert.equal(profile.recommendedNoteIds.length, 6);
  assert.ok(profile.label.includes('Amber-Warmed'));
});

test('generateFormulaCode and generateDeterministicCritique produce valid strings', () => {
  const entries = normalizeBlend({ bergamot: 2, rose: 3, sandalwood: 4 }, FRAGRANCE_NOTES);
  const balance = computeBalanceReport({ bergamot: 2, rose: 3, sandalwood: 4 }, FRAGRANCE_NOTES);
  const matches = computeSimilarityMatches(
    { bergamot: 2, rose: 3, sandalwood: 4 },
    FRAGRANCE_NOTES,
    REFERENCE_PERFUMES
  );

  const code = generateFormulaCode(entries);
  assert.match(code, /^VPL-[0-9A-F]{6}$/);

  const critique = generateDeterministicCritique('Nocturne Study', entries, balance, matches[0]);
  assert.ok(critique.includes('Nocturne Study'));
  assert.ok(critique.includes('Calabrian Bergamot'));
});
