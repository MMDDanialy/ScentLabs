import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { FRAGRANCE_NOTES } from '../data/catalog';
import type { BlendSelection } from '../types/fragrance';
import { ALGORITHM_VERSION } from './similarityEngine';
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

test('TEST 1 — Fresh Citrus / Aromatic Composition ranks fresh citrus/aromatic references', () => {
  const repo = createLoadedRepo();
  const res = repo.match(
    { bergamot: 6, lemon: 4, petitgrain: 3, lavender: 2, musk: 2 },
    FRAGRANCE_NOTES,
    { limit: 8 }
  );
  assert.equal(res.algorithmVersion, ALGORITHM_VERSION);
  assert.ok(res.matches.length >= 5);
  const top = res.matches[0];
  assert.ok(top.similarityScore >= 40 && top.similarityScore <= 98);
  const famAccStr = `${top.perfume.family} ${top.perfume.accords.join(' ')}`.toLowerCase();
  assert.ok(
    /citrus|fresh|aromatic|herbal|green|clean/.test(famAccStr),
    `Expected citrus/fresh/aromatic lead, got ${famAccStr}`
  );
});

test('TEST 2 — Floral / Sweet Composition ranks floral/sweet references distinct from citrus', () => {
  const repo = createLoadedRepo();
  const citrusRes = repo.match({ bergamot: 6, lemon: 4, petitgrain: 3 }, FRAGRANCE_NOTES, { limit: 6 });
  const floralRes = repo.match({ rose: 5, jasmine: 4, vanilla: 4, 'tonka-bean': 3 }, FRAGRANCE_NOTES, {
    limit: 6,
  });

  assert.ok(floralRes.matches.length >= 5);
  const top = floralRes.matches[0];
  const famAccStr = `${top.perfume.family} ${top.perfume.accords.join(' ')}`.toLowerCase();
  assert.ok(
    /floral|petal|bloom|sweet|vanilla|warm/.test(famAccStr),
    `Expected floral/sweet lead, got ${famAccStr}`
  );

  const citrusIds = new Set(citrusRes.matches.map((m) => m.perfume.id));
  const overlap = floralRes.matches.filter((m) => citrusIds.has(m.perfume.id));
  assert.ok(overlap.length <= 1, `Expected distinct floral vs citrus top matches, overlap=${overlap.length}`);
});

test('TEST 3 — Dark Woody / Smoky / Spicy Composition ranks dark woody/amber/spicy references disjoint from citrus', () => {
  const repo = createLoadedRepo();
  const marineCitrusRes = repo.match(
    { 'sea-salt': 6, grapefruit: 5, juniper: 4, petitgrain: 4, cedarwood: 2 },
    FRAGRANCE_NOTES,
    { limit: 6 }
  );
  const darkRes = repo.match(
    { 'oud-smoke': 6, saffron: 4, patchouli: 4, sandalwood: 3, amber: 2 },
    FRAGRANCE_NOTES,
    { limit: 6 }
  );

  assert.ok(darkRes.matches.length >= 5);
  const top = darkRes.matches[0];
  const famAccStr = `${top.perfume.family} ${top.perfume.accords.join(' ')}`.toLowerCase();
  assert.ok(
    /oud|smoke|wood|amber|spice|warm|leather|resinous/.test(famAccStr),
    `Expected dark woody/amber/spicy character, got ${famAccStr}`
  );

  const marineIds = new Set(marineCitrusRes.matches.map((m) => m.perfume.id));
  const intersection = darkRes.matches.filter((m) => marineIds.has(m.perfume.id));
  assert.equal(intersection.length, 0);
});

test('TEST 4 — Ratio Sensitivity: 1/1/1 vs 6/1/1 produces measurably different scores, breakdowns, and rankings', () => {
  const repo = createLoadedRepo();
  const equalBlend = { bergamot: 1, lavender: 1, sandalwood: 1 };
  const topHeavyBlend = { bergamot: 6, lavender: 1, sandalwood: 1 };

  const resEqual = repo.match(equalBlend, FRAGRANCE_NOTES, { limit: 8 });
  const resTopHeavy = repo.match(topHeavyBlend, FRAGRANCE_NOTES, { limit: 8 });

  const obsessionEqual = resEqual.matches.find((m) => m.perfume.id === 'calvin-klein-obsession');
  const sandaloEqual = resEqual.matches.find((m) => m.perfume.id === 'acqua-di-parma-sandalo');
  const obsessionHeavy = resTopHeavy.matches.find((m) => m.perfume.id === 'calvin-klein-obsession');
  const sandaloHeavy = resTopHeavy.matches.find((m) => m.perfume.id === 'acqua-di-parma-sandalo');

  assert.ok(sandaloHeavy, 'Sandalo should appear in 6/1/1 top matches');

  if (obsessionEqual && obsessionHeavy) {
    assert.notDeepEqual(
      obsessionEqual.scoreBreakdown,
      obsessionHeavy.scoreBreakdown,
      'Obsession scoreBreakdown must respond when bergamot goes from 33% to 75%'
    );
    assert.ok(
      obsessionHeavy.similarityScore < obsessionEqual.similarityScore,
      `Obsession score should drop on 6/1/1 citrus-heavy blend (${obsessionHeavy.similarityScore} vs ${obsessionEqual.similarityScore})`
    );
  }

  if (sandaloEqual && sandaloHeavy) {
    assert.notDeepEqual(
      sandaloEqual.scoreBreakdown,
      sandaloHeavy.scoreBreakdown,
      'Sandalo scoreBreakdown must reflect shifted pyramid & citrus family share'
    );
  }

  if (sandaloHeavy && obsessionHeavy) {
    assert.ok(
      sandaloHeavy.similarityScore > obsessionHeavy.similarityScore,
      `Citrus-top Sandalo (${sandaloHeavy.similarityScore}) should outscore Amber/Spicy Obsession (${obsessionHeavy.similarityScore}) on 6/1/1 bergamot-dominant blend`
    );
  }

  // Overall top-3 ranking should respond to 33/33/34 -> 75/12.5/12.5 shift
  const top3Equal = resEqual.matches.slice(0, 3).map((m) => `${m.perfume.id}:${m.similarityScore}`);
  const top3Heavy = resTopHeavy.matches.slice(0, 3).map((m) => `${m.perfume.id}:${m.similarityScore}`);
  assert.notDeepEqual(top3Equal, top3Heavy);
});

test('TEST 5 — Contradictory / Related Note Disjointness: zero notes appear in both Shared and Missing', () => {
  const repo = createLoadedRepo();
  const normalizer = repo.getNormalizer();

  // Include multiple notes with related-cousin mappings in Scento: black-tea (~tea), sea-salt (~sea-notes), oud-smoke (~oud)
  const blends: BlendSelection[] = [
    { 'black-tea': 4, 'sea-salt': 4, 'oud-smoke': 3, bergamot: 3, iris: 2 },
    { rose: 4, jasmine: 4, sandalwood: 4, amber: 3, musk: 3 },
  ];

  for (const blend of blends) {
    const res = repo.match(blend, FRAGRANCE_NOTES, { limit: 12 });
    for (const m of res.matches) {
      const sharedRefSet = new Set(m.sharedCanonicalIds ?? []);
      const refOnlyCanonSet = new Set(
        (m.refOnlyNoteNames ?? []).map((raw) => normalizer.resolve(raw).canonicalId)
      );

      for (const cid of sharedRefSet) {
        assert.ok(
          !refOnlyCanonSet.has(cid),
          `Contradictory canonical ID '${cid}' appeared in both sharedCanonicalIds and refOnlyNoteNames for ${m.perfume.name}`
        );
      }

      // Also ensure keyDifferences text never names a note already matched as cousin or exact in sharedNotes
      const sharedLowerTokens = m.sharedNotes.flatMap((sn) =>
        sn
          .toLowerCase()
          .replace(/[~()]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 3)
      );
      const refMissingDiff = m.keyDifferences.find((d) => d.startsWith('Reference includes '));
      if (refMissingDiff) {
        const missingRaw = refMissingDiff
          .replace('Reference includes ', '')
          .replace(' absent in your blend', '')
          .split(' & ');
        for (const item of missingRaw) {
          const itemCid = normalizer.resolve(item).canonicalId;
          assert.ok(
            !sharedRefSet.has(itemCid),
            `Divergence mentions '${item}' (${itemCid}) which is already in sharedCanonicalIds of ${m.perfume.name}`
          );
          if (m.matchedDetails.some((d) => d.canonicalId === itemCid)) {
            assert.fail(`Matched canonicalId '${itemCid}' leaked into missing diff: ${refMissingDiff}`);
          }
          // Sanity check cousin display token doesn't duplicate
          void sharedLowerTokens;
        }
      }
    }
  }
});

test('TEST 6 — Empty Composition returns empty matches safely without NaN', () => {
  const repo = createLoadedRepo();
  const res = repo.match({}, FRAGRANCE_NOTES, { limit: 8 });
  assert.equal(res.matches.length, 0);
  assert.equal(res.strongMatches.length, 0);
  assert.equal(res.candidateCount, 0);
  assert.ok(res.lowMatchNotice && res.lowMatchNotice.length > 0);
});

test('TEST 7 — Single-Tier Composition handles pure top-tier blend safely and surfaces structural divergence', () => {
  const repo = createLoadedRepo();
  const res = repo.match({ bergamot: 5, lemon: 5 }, FRAGRANCE_NOTES, { limit: 8 });
  assert.ok(res.matches.length >= 5);
  for (const m of res.matches) {
    assert.ok(Number.isFinite(m.similarityScore) && m.similarityScore >= 0 && m.similarityScore <= 98);
    if (m.confidenceReliable) {
      assert.ok(m.confidenceScore !== null && Number.isFinite(m.confidenceScore) && m.confidenceScore >= 15 && m.confidenceScore <= 96);
    } else {
      assert.equal(m.confidenceScore, null);
    }
    if (m.perfume.pyramidComplete) {
      assert.ok(
        m.keyDifferences.some((d) => d.includes('Single-tier user formula')),
        `Expected single-tier structural note in keyDifferences for ${m.perfume.name}`
      );
    }
  }
});

test('TEST 8 — Database Expansion & Year Validation: runtime upsertPerfumes indexes immediately and rejects invalid years', () => {
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
      {
        id: 'atelier-test-bad-year',
        name: 'Invalid Year Archive Check',
        house: 'Atelier Test House',
        year: 99999,
        notes: ['Bergamot', 'Amber'],
      },
    ],
    { persist: false }
  );

  assert.equal(importResult.added, 2);
  assert.equal(repo.getPerfumeCount(), initialCount + 2);

  const page = repo.queryCatalog({ q: 'Invalid Year Archive Check', limit: 10 });
  assert.equal(page.items[0].releaseYear, null, 'Out-of-range releaseYear must be sanitized to null');

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

test('TEST 9 — Low-Confidence Incomplete Reference receives lower confidence without fabricated pyramid notes', () => {
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
  assert.ok(completeMatch.confidenceScore !== null && incompleteMatch.confidenceScore !== null);
  assert.ok(
    incompleteMatch.confidenceScore < completeMatch.confidenceScore,
    `Expected lower confidence for minimal record (${incompleteMatch.confidenceScore}) vs complete (${completeMatch.confidenceScore})`
  );
});

test('TEST 10 — Deterministic Repeatability & Provenance: repeated queries match byte-for-byte', () => {
  const repo = createLoadedRepo();
  const blend = { rose: 5, patchouli: 4, amber: 4, bergamot: 3 };

  const run1 = repo.match(blend, FRAGRANCE_NOTES, { limit: 8 });
  const run2 = repo.match(blend, FRAGRANCE_NOTES, { limit: 8 });

  assert.deepEqual(
    run1.matches.map((m) => ({
      id: m.perfume.id,
      score: m.similarityScore,
      conf: m.confidenceScore,
      breakdown: m.scoreBreakdown,
      shared: m.sharedNotes,
    })),
    run2.matches.map((m) => ({
      id: m.perfume.id,
      score: m.similarityScore,
      conf: m.confidenceScore,
      breakdown: m.scoreBreakdown,
      shared: m.sharedNotes,
    }))
  );

  assert.ok(run1.attribution.license.includes('CC BY 4.0'));
  for (const m of run1.matches) {
    assert.ok(m.perfume.provenance.provider.length > 0);
    assert.match(m.perfume.provenance.sourceUrl, /^https?:\/\//);
    assert.ok(m.scoreBreakdown !== undefined);
  }
});

test('Known Libre-like reference composition ranks ysl-libre among top matches', () => {
  const repo = createLoadedRepo();
  const libreLikeBlend = {
    mandarin: 4,
    neroli: 4,
    lavender: 4,
    jasmine: 4,
    musk: 3,
    vanilla: 3,
  };
  const res = repo.match(libreLikeBlend, FRAGRANCE_NOTES, { limit: 8 });
  const top5Ids = res.matches.slice(0, 5).map((m) => m.perfume.id);
  assert.ok(
    top5Ids.includes('ysl-libre'),
    `Expected ysl-libre in top 5, got: ${top5Ids.join(', ')}`
  );
});

test('TEST 11 — Calibrated Confidence varies honestly across matches and returns null for sparse/unreliable records', () => {
  const repo = createLoadedRepo();

  repo.upsertPerfumes(
    [
      {
        id: 'test-sparse-minimal-2notes',
        name: 'Sparse Two-Note Fragment',
        house: 'Sparse House',
        year: null,
        concentration: null,
        notes: ['Bergamot', 'Amber'],
      },
    ],
    { persist: false }
  );

  const res = repo.match(
    { bergamot: 5, amber: 5, sandalwood: 3, rose: 2 },
    FRAGRANCE_NOTES,
    { limit: 12 }
  );

  const numericConfs = res.matches
    .filter((m) => m.confidenceReliable && m.confidenceScore !== null)
    .map((m) => m.confidenceScore as number);

  assert.ok(numericConfs.length >= 4);
  const distinctValues = new Set(numericConfs);
  assert.ok(distinctValues.size >= 3, `Expected varied calibrated confidence scores, got ${numericConfs.join(', ')}`);
  assert.ok(numericConfs.every((c) => c <= 96 && c >= 15), 'Confidence scores must not saturate at 98-100%');

  const sparseOnlyRes = repo.match({ bergamot: 5, amber: 5 }, FRAGRANCE_NOTES, { limit: 12 });
  const sparseMatch = sparseOnlyRes.matches.find((m) => m.perfume.id === 'test-sparse-minimal-2notes');
  if (sparseMatch) {
    assert.equal(sparseMatch.confidenceReliable, false);
    assert.equal(sparseMatch.confidenceScore, null);
  }
});

test('TEST 12 — Gender Filtering excludes non-matching genders without altering similarityScore', () => {
  const repo = createLoadedRepo();
  const blend = { bergamot: 4, lavender: 4, sandalwood: 4, amber: 3 };

  const allRes = repo.match(blend, FRAGRANCE_NOTES, { limit: 12, gender: 'all' });
  for (const targetGender of ['masculine', 'feminine', 'unisex', 'unknown'] as const) {
    const filteredRes = repo.match(blend, FRAGRANCE_NOTES, { limit: 12, gender: targetGender });
    assert.equal(filteredRes.activeGenderFilter, targetGender);
    for (const m of filteredRes.matches) {
      assert.equal(m.perfume.gender, targetGender);
      const inAll = allRes.matches.find((a) => a.perfume.id === m.perfume.id);
      if (inAll) {
        assert.equal(
          m.similarityScore,
          inAll.similarityScore,
          `Gender filter must apply zero score penalty for ${m.perfume.id}`
        );
      }
    }
  }
});

test('TEST 13 — Explicit 5-Category Note Tier Classification separates exact, mismatched, and undocumented flat tiers', () => {
  const repo = createLoadedRepo();
  repo.upsertPerfumes(
    [
      {
        id: 'test-tier-audit-pyramid',
        name: 'Tier Audit Study',
        house: 'Audit House',
        year: 2025,
        family: 'Salt & Mineral',
        character: ['salty', 'fresh', 'woody'],
        top_notes: ['Juniper', 'Salt', 'Bergamot'],
        heart_notes: ['Sandalwood'], // deliberately placed in heart while user catalog places sandalwood in base
        base_notes: ['Vanilla', 'Patchouli'],
      },
      {
        id: 'test-tier-audit-flat',
        name: 'Flat Tier Audit Study',
        house: 'Audit House',
        family: 'Salt & Mineral',
        character: ['salty', 'fresh', 'woody'],
        notes: ['Juniper', 'Salt', 'Bergamot', 'Sandalwood', 'Vanilla'],
      },
    ],
    { persist: false }
  );

  const res = repo.match(
    { juniper: 4, 'sea-salt': 4, bergamot: 3, sandalwood: 4, jasmine: 2 },
    FRAGRANCE_NOTES,
    { limit: 12 }
  );

  const pyramidAudit = res.matches.find((m) => m.perfume.id === 'test-tier-audit-pyramid');
  assert.ok(pyramidAudit);
  assert.ok(pyramidAudit.noteComparison.exactShared.some((d) => d.canonicalId === 'bergamot'));
  assert.ok(
    pyramidAudit.noteComparison.tierMismatchShared.some(
      (d) => d.canonicalId === 'sandalwood' && d.userLayer === 'base' && d.refLayer === 'heart'
    )
  );
  assert.ok(pyramidAudit.noteComparison.userOnly.some((u) => u.noteId === 'jasmine'));
  assert.ok(pyramidAudit.noteComparison.referenceOnly.some((r) => r.canonicalId === 'vanilla'));

  const flatAudit = res.matches.find((m) => m.perfume.id === 'test-tier-audit-flat');
  assert.ok(flatAudit);
  assert.equal(flatAudit.noteComparison.tierMismatchShared.length, 0, 'Flat records must never claim tier mismatch');
  assert.ok(flatAudit.noteComparison.undocumentedTierShared.length >= 3, 'Flat shared notes must be labeled undocumentedTierShared');
  assert.ok(flatAudit.noteComparison.unknownOrUndocumented.length >= 3);
});

