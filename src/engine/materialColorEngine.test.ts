import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAGRANCE_NOTES } from '../data/catalog';
import { computeBalanceReport, normalizeBlend } from './formulationEngine';
import {
  calculateVesselLiquidAppearance,
  getMaterialVisualMetadata,
  MATERIAL_VISUAL_METADATA,
} from './materialColorEngine';

test('All 27 catalog materials have complete structured visual & optical metadata', () => {
  assert.equal(FRAGRANCE_NOTES.length, 27);
  for (const note of FRAGRANCE_NOTES) {
    const meta = note.visualMeta ?? getMaterialVisualMetadata(note.id);
    assert.ok(meta, `Missing visualMeta for material ${note.id}`);
    assert.equal(meta.materialId, note.id);
    assert.equal(meta.tier, note.layer);
    assert.match(meta.visualColorHex, /^#[0-9A-Fa-f]{6}$/);
    assert.match(meta.bottleTintHex, /^#[0-9A-Fa-f]{6}$/);
    assert.match(meta.labelToneHex, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(meta.opacity > 0 && meta.opacity <= 0.95);
    assert.ok(Math.abs(meta.opacity + meta.transparency - 1) <= 0.02);
    assert.ok(meta.visualIntensity > 0);
    assert.ok(meta.documentedLiquidColor.length > 10);
    assert.ok(meta.colorSource.length > 10);
  }
  assert.equal(Object.keys(MATERIAL_VISUAL_METADATA).length, 27);
});

test('Material visual colors reflect documented liquid reality (lavender & white musk are pale/clear, jasmine & saffron are amber/crimson)', () => {
  const lavender = MATERIAL_VISUAL_METADATA.lavender;
  const musk = MATERIAL_VISUAL_METADATA.musk;
  const jasmine = MATERIAL_VISUAL_METADATA.jasmine;
  const saffron = MATERIAL_VISUAL_METADATA.saffron;

  assert.ok(lavender.opacity < 0.25, 'Steam-distilled lavender oil should be translucent pale straw, not purple');
  assert.ok(musk.opacity <= 0.15, 'White musk dilution should be nearly colorless');
  assert.ok(jasmine.visualIntensity > lavender.visualIntensity * 2, 'Jasmine absolute should be far more chromophoric than lavender');
  assert.ok(saffron.visualIntensity > 1.0, 'Saffron crocin tincture should have high chromophore intensity');
  assert.equal(musk.colorConfidence, 'estimated');
  assert.equal(jasmine.colorConfidence, 'documented-typical');
});

test('Beer–Lambert liquid appearance handles empty vessel and recalculates deterministically on add, remove, and reset', () => {
  const emptyAppearance = calculateVesselLiquidAppearance([]);
  assert.equal(emptyAppearance.fillPercent, 0);
  assert.equal(emptyAppearance.effectiveOpacity, 0);
  assert.equal(emptyAppearance.opticalDensity, 0);
  assert.equal(emptyAppearance.materialCount, 0);

  const clearMusk = computeBalanceReport({ musk: 6 }, FRAGRANCE_NOTES);
  const saffronInfused = computeBalanceReport({ musk: 6, saffron: 2 }, FRAGRANCE_NOTES);
  const darkResin = computeBalanceReport({ musk: 6, saffron: 2, amber: 4, 'oud-smoke': 3 }, FRAGRANCE_NOTES);

  assert.ok(clearMusk.liquidAppearance && saffronInfused.liquidAppearance && darkResin.liquidAppearance);
  assert.notEqual(clearMusk.blendedColorHex, saffronInfused.blendedColorHex);
  assert.notEqual(saffronInfused.blendedColorHex, darkResin.blendedColorHex);
  assert.ok(
    saffronInfused.liquidAppearance.opticalDensity > clearMusk.liquidAppearance.opticalDensity,
    'Adding saffron to clear musk must increase optical density'
  );
  assert.ok(
    darkResin.liquidAppearance.opticalDensity > saffronInfused.liquidAppearance.opticalDensity,
    'Adding amber and oud must increase optical density further'
  );
  assert.equal(darkResin.liquidAppearance.viscosityProfile, 'medium-oil');

  const pureResin = computeBalanceReport({ amber: 5, 'oud-smoke': 4, vanilla: 3 }, FRAGRANCE_NOTES);
  assert.equal(pureResin.liquidAppearance?.viscosityProfile, 'viscous-resin');

  // Simulating Undo back to saffronInfused restores identical liquid appearance
  const afterUndo = computeBalanceReport({ musk: 6, saffron: 2 }, FRAGRANCE_NOTES);
  assert.deepEqual(afterUndo.liquidAppearance, saffronInfused.liquidAppearance);
  assert.equal(afterUndo.blendedColorHex, saffronInfused.blendedColorHex);

  // Simulating Reset back to empty clears fillPercent and opticalDensity
  const afterReset = computeBalanceReport({}, FRAGRANCE_NOTES);
  assert.equal(afterReset.liquidAppearance?.fillPercent, 0);
  assert.equal(afterReset.liquidAppearance?.opticalDensity, 0);

  // Verify normalizeBlend preserves entry visualMeta cleanly
  const entries = normalizeBlend({ bergamot: 3, vanilla: 2 }, FRAGRANCE_NOTES);
  assert.ok(entries[0].note.visualMeta);
  assert.ok(entries[1].note.visualMeta);
});
