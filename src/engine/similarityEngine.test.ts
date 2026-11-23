import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { FRAGRANCE_NOTES } from '../data/catalog';
import { CatalogRepository } from '../server/catalogRepository';

function createLoadedRepo(): CatalogRepository {
  const repo = new CatalogRepository(path.resolve(process.cwd(), 'data'));
  repo.loadFromDisk();
  return repo;
}

test('Catalog loads real Scento CC BY 4.0 dataset (>1,400 perfumes) with accurate stats', () => {
  const repo = createLoadedRepo();
  const stats = repo.getStats();
  assert.ok(stats.totalPerfumes >= 1400, `Expected >=1400 perfumes, got ${stats.totalPerfumes}`);
  assert.ok(stats.totalHouses >= 150, `Expected >=150 houses, got ${stats.totalHouses}`);
  assert.ok(stats.totalMaterials >= 400, `Expected >=400 materials, got ${stats.totalMaterials}`);
  assert.ok(stats.completePyramids > 1000);
  assert.ok(stats.flatNotesOnly > 0);
});

test('Test A: Known reference composition ranks its reference perfume among top matches', () => {
  const repo = createLoadedRepo();
  // YSL Libre in Scento: top [Mandarin, Neroli, Lavender], heart [Orange Blossom, Jasmine Sambac], base [Musk, Vanilla]
  const libreLikeBlend = {
    mandarin: 4,
    neroli: 4,
    lavender: 4,
    jasmine: 4,
    musk: 3,
    vanilla: 3,
  };
  const res = repo.match(libreLikeBlend, FRAGRANCE_NOTES, { limit: 8 });
  assert.ok(res.matches.length >= 5);
  assert.ok(res.searchedCount >= 1400);

  const top5Ids = res.matches.slice(0, 5).map((m) => m.perfume.id);
  assert.ok(
    top5Ids.includes('ysl-libre'),
    `Expected ysl-libre in top 5, got: ${top5Ids.join(', ')}`
  );
  const libreMatch = res.matches.find((m) => m.perfume.id === 'ysl-libre')!;
  assert.ok(libreMatch.similarityScore >= 55);
  assert.ok(libreMatch.sharedNotes.length >= 5);
});

test('Test B: Changing notes and blend proportions dynamically alters rankings and scores', () => {
  const repo = createLoadedRepo();
  const citrusDominant = {
    bergamot: 10,
    lemon: 8,
    neroli: 2,
    cedarwood: 1,
    musk: 1,
  };
  const vanillaAmberDominant = {
    bergamot: 1,
    lemon: 1,
    neroli: 1,
    vanilla: 10,
    amber: 9,
  };

  const resA = repo.match(citrusDominant, FRAGRANCE_NOTES, { limit: 8 });
  const resB = repo.match(vanillaAmberDominant, FRAGRANCE_NOTES, { limit: 8 });

  assert.notEqual(resA.matches[0].perfume.id, resB.matches[0].perfume.id);
  const top3A = resA.matches.slice(0, 3).map((m) => m.perfume.id);
  const top3B = resB.matches.slice(0, 3).map((m) => m.perfume.id);
  assert.notDeepEqual(top3A, top3B);
});

test('Test C: Substantially different compositions return distinct match sets without inflated scores', () => {
  const repo = createLoadedRepo();
  const marineCitrusBlend = {
    'sea-salt': 6,
    grapefruit: 5,
    juniper: 4,
    petitgrain: 4,
    cedarwood: 2,
  };
  const smokyOudSpiceBlend = {
    'oud-smoke': 7,
    saffron: 4,
    cinnamon: 3,
    amber: 5,
    patchouli: 4,
  };

  const marineRes = repo.match(marineCitrusBlend, FRAGRANCE_NOTES, { limit: 6 });
  const oudRes = repo.match(smokyOudSpiceBlend, FRAGRANCE_NOTES, { limit: 6 });

  const marineIds = new Set(marineRes.matches.map((m) => m.perfume.id));
  const oudIds = new Set(oudRes.matches.map((m) => m.perfume.id));
  const intersection = [...marineIds].filter((id) => oudIds.has(id));
  assert.equal(
    intersection.length,
    0,
    `Expected disjoint top matches between Marine Citrus and Smoky Oud Spice, found overlap: ${intersection.join(', ')}`
  );

  // Verify unrelated synthetic record does not get artificially inflated high score
  const singleNoteRes = repo.match({ 'sea-salt': 10 }, FRAGRANCE_NOTES, { limit: 8 });
  const worstOfTop = singleNoteRes.matches[singleNoteRes.matches.length - 1];
  assert.ok(
    worstOfTop.similarityScore < 70,
    `Expected realistic similarity score distribution, got ${worstOfTop.similarityScore}`
  );
});

test('Test D: Runtime catalog expansion makes newly added perfume immediately matchable with zero code edits', () => {
  const repo = createLoadedRepo();
  const initialCount = repo.getPerfumeCount();

  const importResult = repo.upsertPerfumes(
    [
      {
        id: 'atelier-test-marine-iris-99',
        name: 'Nocturne Sea Salt Iris Study',
        house: 'Atelier Test House',
        year: 2026,
        concentration: 'extrait',
        family: 'Salt & Mineral',
        character: ['salty', 'fresh', 'powdery', 'woody'],
        top_notes: ['Salt', 'Juniper', 'Grapefruit'],
        heart_notes: ['Iris', 'Black Tea'],
        base_notes: ['Vetiver', 'Cedarwood'],
        url: 'https://www.scento.com/perfume-database',
      },
    ],
    { persist: false }
  );

  assert.equal(importResult.added, 1);
  assert.equal(importResult.duplicates, 0);
  assert.equal(repo.getPerfumeCount(), initialCount + 1);

  // Inserting exact duplicate should be caught cleanly
  const dupResult = repo.upsertPerfumes(
    [
      {
        name: 'Nocturne Sea Salt Iris Study',
        house: 'Atelier Test House',
        year: 2026,
        concentration: 'extrait',
        notes: ['Salt'],
      },
    ],
    { persist: false }
  );
  assert.equal(dupResult.added, 0);
  assert.equal(dupResult.duplicates, 1);

  const matchRes = repo.match(
    {
      'sea-salt': 5,
      juniper: 4,
      grapefruit: 3,
      iris: 4,
      'black-tea': 3,
      vetiver: 4,
      cedarwood: 3,
    },
    FRAGRANCE_NOTES,
    { limit: 5 }
  );

  assert.equal(matchRes.matches[0].perfume.id, 'atelier-test-marine-iris-99');
  assert.ok(matchRes.matches[0].similarityScore >= 75);
});

test('Test E: Incomplete / missing pyramid records receive lower confidence without fabricated notes', () => {
  const repo = createLoadedRepo();

  repo.upsertPerfumes(
    [
      {
        id: 'test-complete-pyramid',
        name: 'Complete Cardamom Sandal Study',
        house: 'Test Completeness House',
        year: 2025,
        family: 'Wood & Root',
        character: ['woody', 'spicy', 'warm'],
        top_notes: ['Bergamot', 'Pink Pepper'],
        heart_notes: ['Cardamom', 'Rose'],
        base_notes: ['Sandalwood', 'Cedarwood'],
      },
      {
        id: 'test-incomplete-flat-only',
        name: 'Minimal Flat Cardamom Sandal Study',
        house: 'Test Completeness House',
        year: null,
        concentration: null,
        family: 'Wood & Root',
        character: ['woody', 'spicy', 'warm'],
        top_notes: [],
        heart_notes: [],
        base_notes: [],
        notes: ['Bergamot', 'Pink Pepper', 'Cardamom', 'Rose', 'Sandalwood', 'Cedarwood'],
      },
    ],
    { persist: false }
  );

  const res = repo.match(
    {
      bergamot: 3,
      'pink-pepper': 2,
      cardamom: 4,
      rose: 3,
      sandalwood: 5,
      cedarwood: 4,
    },
    FRAGRANCE_NOTES,
    { limit: 10 }
  );

  const completeMatch = res.matches.find((m) => m.perfume.id === 'test-complete-pyramid');
  const incompleteMatch = res.matches.find((m) => m.perfume.id === 'test-incomplete-flat-only');

  assert.ok(completeMatch, 'Complete record should appear in top matches');
  assert.ok(incompleteMatch, 'Incomplete flat record should still be matched on shared notes');
  assert.equal(incompleteMatch.perfume.completeness, 'minimal');
  assert.equal(incompleteMatch.perfume.pyramidComplete, false);
  assert.equal(incompleteMatch.perfume.releaseYear, null);
  assert.equal(incompleteMatch.perfume.topNoteNames.length, 0);
  assert.ok(
    incompleteMatch.confidenceScore < completeMatch.confidenceScore,
    `Expected lower confidence for minimal record (${incompleteMatch.confidenceScore}) vs complete (${completeMatch.confidenceScore})`
  );
});

test('Test F: Every match includes verified provenance, license, and accessible source URL', () => {
  const repo = createLoadedRepo();
  const res = repo.match({ rose: 5, patchouli: 4, amber: 4, bergamot: 3 }, FRAGRANCE_NOTES, {
    limit: 8,
  });

  assert.ok(res.attribution.license.includes('CC BY 4.0'));
  assert.ok(res.attribution.url.startsWith('https://'));

  for (const m of res.matches) {
    assert.ok(m.perfume.provenance.provider.length > 0);
    assert.ok(m.perfume.provenance.license.length > 0);
    assert.match(m.perfume.provenance.sourceUrl, /^https?:\/\//);
    assert.ok(['complete', 'partial', 'minimal'].includes(m.perfume.completeness));
    assert.ok(m.confidenceScore >= 20 && m.confidenceScore <= 100);
  }
});
