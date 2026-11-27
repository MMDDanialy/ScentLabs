import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { CatalogRepository } from './catalogRepository';
import { classifyPerfumeGender } from './genderClassifier';

test('classifyPerfumeGender respects explicit metadata, title designations, and false-positive guards', () => {
  const explicitMasc = classifyPerfumeGender({
    name: 'Atelier Reserve',
    explicitGender: 'Men',
  });
  assert.equal(explicitMasc.gender, 'masculine');
  assert.equal(explicitMasc.source, 'explicit-metadata');

  const explicitFem = classifyPerfumeGender({
    name: 'Atelier Fleur',
    explicitGender: 'for women',
  });
  assert.equal(explicitFem.gender, 'feminine');
  assert.equal(explicitFem.source, 'explicit-metadata');

  const hommeTitle = classifyPerfumeGender({
    name: 'Dior Homme Intense',
  });
  assert.equal(hommeTitle.gender, 'masculine');
  assert.equal(hommeTitle.source, 'title-designation');

  const femmeTitle = classifyPerfumeGender({
    name: 'Narciso Rodriguez For Her',
  });
  assert.equal(femmeTitle.gender, 'feminine');
  assert.equal(femmeTitle.source, 'title-designation');

  // Byredo Rose of No Man's Land must NOT be misclassified as masculine because of "Man's"
  const byredoNoMansLand = classifyPerfumeGender({
    id: 'byredo-rose-of-no-mans-land',
    name: "Rose of No Man's Land",
    houseId: 'byredo',
    house: 'Byredo',
  });
  assert.equal(byredoNoMansLand.gender, 'unisex');
  assert.equal(byredoNoMansLand.source, 'curated-unisex-registry');
});

test('classifyPerfumeGender never infers gender from floral/woody notes and returns unknown when undocumented', () => {
  const roseOudUndocumented = classifyPerfumeGender({
    id: 'atelier-undocumented-1',
    name: 'Velvet Rose & Cedar Study',
    house: 'Independent House',
    description: 'Rich Damascus rose over Atlas cedarwood and warm ambergris.',
  });
  assert.equal(roseOudUndocumented.gender, 'unknown');
  assert.equal(roseOudUndocumented.source, 'unknown');

  const descFem = classifyPerfumeGender({
    id: 'atelier-desc-fem',
    name: 'Floral Dawn',
    house: 'Classic House',
    description: 'A radiant luminous jasmine floral for women.',
  });
  assert.equal(descFem.gender, 'feminine');
  assert.equal(descFem.source, 'description-statement');
});

test('CatalogRepository computes non-empty genderCounts across Scento dataset', () => {
  const repo = new CatalogRepository(path.resolve(process.cwd(), 'data'));
  repo.loadFromDisk();
  const stats = repo.getStats();
  const sumGenders =
    stats.genderCounts.masculine +
    stats.genderCounts.feminine +
    stats.genderCounts.unisex +
    stats.genderCounts.unknown;
  assert.equal(sumGenders, stats.totalPerfumes);
  assert.ok(stats.genderCounts.masculine > 0);
  assert.ok(stats.genderCounts.feminine > 0);
  assert.ok(stats.genderCounts.unisex > 0);
  assert.ok(stats.genderCounts.unknown > 0);
});
