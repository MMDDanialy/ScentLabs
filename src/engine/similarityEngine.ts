import type {
  BalanceReport,
  BlendSelection,
  FacetProfile,
  FragranceNote,
  MatchApiResponse,
  MatchedNoteDetail,
  MatchResult,
  MatchStrengthTier,
  NoteLayer,
  OlfactoryFamily,
  ReferencePerfume,
} from '../types/fragrance';
import { computeBalanceReport, normalizeBlend } from './formulationEngine';
import { NoteNormalizer } from './noteNormalization';

export interface CatalogIndex {
  perfumes: ReferencePerfume[];
  noteToPerfumeIndices: Map<string, number[]>;
  relatedToPerfumeIndices: Map<string, number[]>;
  noteDocumentFrequency: Map<string, number>;
}

const SCENTO_FAMILY_TO_LAB: Record<string, OlfactoryFamily[]> = {
  'wood & root': ['Woody'],
  'white bloom': ['Floral'],
  'petal garden': ['Floral'],
  'sunlit citrus': ['Citrus'],
  'green leaf': ['Aromatic & Herbal'],
  'velvet sweet': ['Amber & Oriental'],
  'spice route': ['Spicy'],
  'orchard fruit': ['Citrus', 'Floral'],
  'amber & resin': ['Amber & Oriental'],
  'powder veil': ['Floral', 'Musk & Skin'],
  'skin musk': ['Musk & Skin'],
  'smoke & leather': ['Smoky & Leather'],
  'salt & mineral': ['Aromatic & Herbal'],
  'oud court': ['Smoky & Leather', 'Woody'],
  // Direct lab families (for custom / imported records)
  citrus: ['Citrus'],
  floral: ['Floral'],
  woody: ['Woody'],
  'amber & oriental': ['Amber & Oriental'],
  spicy: ['Spicy'],
  'smoky & leather': ['Smoky & Leather'],
  'aromatic & herbal': ['Aromatic & Herbal'],
  'musk & skin': ['Musk & Skin'],
};

const CHARACTER_SYNONYMS: Record<string, string[]> = {
  citrusy: ['citrus', 'zesty', 'sparkling', 'bright', 'juicy', 'bitter-crisp'],
  fresh: ['fresh', 'crisp', 'mineral', 'ozonic', 'marine', 'clean', 'airy', 'gin-crisp', 'green'],
  floral: ['floral', 'white floral', 'petal', 'rosy', 'velvet', 'green floral', 'powdery'],
  warm: ['warm', 'balsamic', 'resinous', 'amber', 'warm spicy', 'honeyed', 'velvet'],
  sweet: ['sweet', 'gourmand', 'nectarous', 'honeyed spice', 'coumarin', 'almond-hay'],
  spicy: ['spicy', 'warm spicy', 'fresh spicy', 'saffron', 'camphoraceous'],
  woody: ['woody', 'dry wood', 'creamy wood', 'dark wood', 'architectural'],
  earthy: ['earthy', 'earthy root', 'oakmoss', 'dark wood'],
  creamy: ['creamy', 'creamy wood', 'lactonic', 'lush'],
  herbal: ['herbal', 'aromatic', 'fougère', 'coniferous', 'green'],
  powdery: ['powdery', 'violet-root', 'suede', 'soft'],
  resinous: ['resinous', 'amber', 'balsamic', 'incense'],
  musky: ['clean musk', 'skin', 'soft', 'musky'],
  smoky: ['smoky', 'smoky-green', 'incense', 'oud', 'tea'],
  leathery: ['leather', 'leathery', 'suede', 'saffron'],
  salty: ['marine', 'mineral', 'ozonic', 'salty'],
  clean: ['clean', 'clean musk', 'fresh', 'crisp'],
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function tierProximity(userLayer: NoteLayer, refLayer: NoteLayer | 'unspecified'): number {
  if (refLayer === 'unspecified') return 0.55;
  if (userLayer === refLayer) return 1.0;
  if (
    (userLayer === 'top' && refLayer === 'heart') ||
    (userLayer === 'heart' && userLayer !== refLayer && (refLayer === 'top' || refLayer === 'base')) ||
    (userLayer === 'base' && refLayer === 'heart')
  ) {
    return 0.45;
  }
  return 0.2;
}

function deriveRefFacets(perfume: ReferencePerfume): FacetProfile {
  if (perfume.facets) return perfume.facets;

  const chars = new Set(perfume.accords.map((a) => a.toLowerCase()));
  const fam = perfume.family.toLowerCase();
  const sec = (perfume.secondaryFamily ?? '').toLowerCase();

  let warmth = 45;
  let freshness = 40;
  let sweetness = 35;
  let dryness = 45;
  let smokiness = 15;
  let floralcy = 30;

  if (chars.has('warm') || chars.has('resinous') || chars.has('amber') || fam.includes('amber')) {
    warmth += 36;
    freshness -= 18;
  }
  if (chars.has('fresh') || chars.has('citrusy') || chars.has('salty') || fam.includes('citrus') || fam.includes('salt')) {
    freshness += 42;
    warmth -= 20;
  }
  if (chars.has('sweet') || fam.includes('sweet')) {
    sweetness += 40;
    dryness -= 15;
  }
  if (chars.has('woody') || chars.has('earthy') || fam.includes('wood')) {
    dryness += 34;
    warmth += 10;
  }
  if (chars.has('smoky') || chars.has('leathery') || fam.includes('smoke') || fam.includes('oud')) {
    smokiness += 58;
    dryness += 20;
    warmth += 20;
    freshness -= 20;
  }
  if (chars.has('floral') || fam.includes('bloom') || fam.includes('petal') || sec.includes('petal')) {
    floralcy += 52;
  }
  if (chars.has('spicy') || fam.includes('spice')) {
    warmth += 22;
    dryness += 14;
  }
  if (chars.has('herbal') || chars.has('green') || fam.includes('green')) {
    freshness += 25;
    dryness += 22;
  }
  if (chars.has('powdery')) {
    floralcy += 18;
    sweetness += 12;
  }

  return {
    warmth: clamp(warmth, 5, 95),
    freshness: clamp(freshness, 5, 95),
    sweetness: clamp(sweetness, 5, 95),
    dryness: clamp(dryness, 5, 95),
    smokiness: clamp(smokiness, 0, 95),
    floralcy: clamp(floralcy, 5, 95),
  };
}

export function buildCatalogIndex(
  perfumes: ReferencePerfume[],
  normalizer: NoteNormalizer
): CatalogIndex {
  const noteToPerfumeIndices = new Map<string, number[]>();
  const relatedToPerfumeIndices = new Map<string, number[]>();
  const noteDocumentFrequency = new Map<string, number>();

  for (let i = 0; i < perfumes.length; i++) {
    const p = perfumes[i];
    const seenExact = new Set<string>();
    const seenRelated = new Set<string>();

    for (const cid of p.canonicalNoteIds) {
      if (!seenExact.has(cid)) {
        seenExact.add(cid);
        noteDocumentFrequency.set(cid, (noteDocumentFrequency.get(cid) ?? 0) + 1);
        const list = noteToPerfumeIndices.get(cid);
        if (list) list.push(i);
        else noteToPerfumeIndices.set(cid, [i]);
      }

      for (const rel of normalizer.getRelatedIds(cid)) {
        if (!seenRelated.has(rel)) {
          seenRelated.add(rel);
          const relList = relatedToPerfumeIndices.get(rel);
          if (relList) relList.push(i);
          else relatedToPerfumeIndices.set(rel, [i]);
        }
      }
    }
  }

  return {
    perfumes,
    noteToPerfumeIndices,
    relatedToPerfumeIndices,
    noteDocumentFrequency,
  };
}

export interface MatchQueryOptions {
  limit?: number;
}

export function matchCompositionAgainstCatalog(
  selection: BlendSelection,
  notes: FragranceNote[],
  index: CatalogIndex,
  normalizer: NoteNormalizer,
  options: MatchQueryOptions = {}
): MatchApiResponse {
  const limit = clamp(options.limit ?? 8, 5, 12);
  const entries = normalizeBlend(selection, notes);
  const totalCatalogCount = index.perfumes.length;

  if (entries.length === 0 || totalCatalogCount === 0) {
    return {
      matches: [],
      strongMatches: [],
      exploratoryMatches: [],
      lowMatchNotice:
        totalCatalogCount === 0
          ? 'Reference catalog is currently empty.'
          : 'Add notes to the laboratory vessel to run reference matching.',
      searchedCount: totalCatalogCount,
      candidateCount: 0,
      attribution: {
        name: 'Scento Perfume Database (CC BY 4.0)',
        url: 'https://www.scento.com/perfume-database',
        license: 'CC BY 4.0',
      },
    };
  }

  const balance: BalanceReport = computeBalanceReport(selection, notes);

  // Resolve user's notes to canonical IDs and compute IDF weights
  const userCanonicalEntries = entries.map((entry) => {
    const resolved = normalizer.resolve(entry.note.name);
    // Also check raw note.id in case it's already canonical or has distinct synonym
    const byId = normalizer.resolve(entry.note.id);
    const canonicalId =
      resolved.matchSource !== 'slug-fallback' ? resolved.canonicalId : byId.canonicalId;
    const relatedIds = Array.from(
      new Set([...resolved.relatedIds, ...byId.relatedIds, ...normalizer.getRelatedIds(canonicalId)])
    );
    const df = index.noteDocumentFrequency.get(canonicalId) ?? 0;
    const idf = 1 + Math.log((totalCatalogCount + 1) / (df + 1));

    return {
      entry,
      canonicalId,
      relatedIds,
      idf,
      share: entry.percentage / 100,
    };
  });

  // 1. Candidate retrieval via inverted indexes across the entire active catalog
  const candidateIndexSet = new Set<number>();
  for (const u of userCanonicalEntries) {
    for (const idx of index.noteToPerfumeIndices.get(u.canonicalId) ?? []) {
      candidateIndexSet.add(idx);
    }
    for (const idx of index.relatedToPerfumeIndices.get(u.canonicalId) ?? []) {
      candidateIndexSet.add(idx);
    }
  }

  // Fallback: if inverted index yielded fewer than 20 candidates (e.g., rare/new note blend),
  // include the full catalog so no eligible reference is ever skipped.
  const candidateIndices =
    candidateIndexSet.size >= 20
      ? Array.from(candidateIndexSet)
      : index.perfumes.map((_, i) => i);

  const userTotalIdfMass = userCanonicalEntries.reduce(
    (sum, u) => sum + u.share * u.idf,
    0
  );

  const userAccordsLower = new Set<string>();
  for (const a of balance.dominantAccords) {
    userAccordsLower.add(a.accord.toLowerCase());
  }
  for (const e of entries) {
    for (const a of e.note.accords) {
      userAccordsLower.add(a.toLowerCase());
    }
  }

  const facetKeys: (keyof FacetProfile)[] = [
    'warmth',
    'freshness',
    'sweetness',
    'dryness',
    'smokiness',
    'floralcy',
  ];

  const scored: MatchResult[] = [];

  for (const pIdx of candidateIndices) {
    const perfume = index.perfumes[pIdx];
    const refAllSet = new Set(perfume.canonicalNoteIds);
    const refTopSet = new Set(perfume.topCanonicalIds);
    const refHeartSet = new Set(perfume.heartCanonicalIds);
    const refBaseSet = new Set(perfume.baseCanonicalIds);

    const getRefLayer = (cid: string): NoteLayer | 'unspecified' => {
      if (refTopSet.has(cid)) return 'top';
      if (refHeartSet.has(cid)) return 'heart';
      if (refBaseSet.has(cid)) return 'base';
      return 'unspecified';
    };

    const matchedDetails: MatchedNoteDetail[] = [];
    const sharedNotes: string[] = [];
    let matchedUserWeightedMass = 0;
    let matchedRefIdfMass = 0;
    let tierScoreSum = 0;
    let tierWeightSum = 0;
    let exactMatchCount = 0;
    let relatedMatchCount = 0;

    for (const u of userCanonicalEntries) {
      const weight = u.share * u.idf;

      if (refAllSet.has(u.canonicalId)) {
        const refLayer = getRefLayer(u.canonicalId);
        const tierProx = perfume.pyramidComplete
          ? tierProximity(u.entry.note.layer, refLayer)
          : 0.58;
        const aligned = perfume.pyramidComplete && refLayer === u.entry.note.layer;

        exactMatchCount += 1;
        matchedUserWeightedMass += weight;
        matchedRefIdfMass += u.idf;
        tierScoreSum += weight * tierProx;
        tierWeightSum += weight;

        sharedNotes.push(u.entry.note.name);
        matchedDetails.push({
          noteName: u.entry.note.name,
          canonicalId: u.canonicalId,
          userLayer: u.entry.note.layer,
          refLayer,
          tierAligned: aligned,
          matchType: 'exact',
          userShare: u.entry.percentage,
        });
      } else {
        // Check related material cousins
        const relatedHitId = u.relatedIds.find((rid) => refAllSet.has(rid));
        if (relatedHitId) {
          const refLayer = getRefLayer(relatedHitId);
          const tierProx = perfume.pyramidComplete
            ? tierProximity(u.entry.note.layer, refLayer)
            : 0.5;
          relatedMatchCount += 1;
          matchedUserWeightedMass += weight * 0.45;
          matchedRefIdfMass += u.idf * 0.45;
          tierScoreSum += weight * 0.45 * tierProx;
          tierWeightSum += weight * 0.45;

          const relMat = normalizer.getMaterial(relatedHitId);
          sharedNotes.push(`${u.entry.note.name} (~${relMat?.name ?? relatedHitId})`);
          matchedDetails.push({
            noteName: u.entry.note.name,
            canonicalId: relatedHitId,
            userLayer: u.entry.note.layer,
            refLayer,
            tierAligned: perfume.pyramidComplete && refLayer === u.entry.note.layer,
            matchType: 'related',
            userShare: u.entry.percentage,
          });
        }
      }
    }

    // Reference total IDF mass (guards against short-list bias)
    const refTotalIdfMass = perfume.canonicalNoteIds.reduce((sum, cid) => {
      const df = index.noteDocumentFrequency.get(cid) ?? 0;
      const idf = 1 + Math.log((totalCatalogCount + 1) / (df + 1));
      return sum + idf;
    }, 0);

    const userCoverage = userTotalIdfMass > 0 ? matchedUserWeightedMass / userTotalIdfMass : 0;
    const refCoverage = refTotalIdfMass > 0 ? matchedRefIdfMass / refTotalIdfMass : 0;
    // Harmonic-weighted balance between user formula fit and reference coverage
    const noteOverlapScore = 0.62 * userCoverage + 0.38 * refCoverage;

    const tierAlignmentScore =
      tierWeightSum > 0 ? clamp(tierScoreSum / tierWeightSum, 0, 1) : 0;

    // 3. Family & Character/Accord proximity
    const sharedAccords: string[] = [];
    for (const acc of perfume.accords) {
      const lower = acc.toLowerCase();
      const syns = CHARACTER_SYNONYMS[lower] ?? [lower];
      if (syns.some((s) => userAccordsLower.has(s))) {
        sharedAccords.push(acc);
      }
    }
    const accordUnion = Math.max(1, new Set([...userAccordsLower, ...perfume.accords.map((a) => a.toLowerCase())]).size);
    const accordBaseRatio =
      perfume.accords.length > 0
        ? clamp(sharedAccords.length / Math.min(perfume.accords.length, 4), 0, 1)
        : 0;
    const accordJaccard = sharedAccords.length / accordUnion;

    let familyMatch = 0;
    if (balance.dominantFamily) {
      const mappedPrimary = SCENTO_FAMILY_TO_LAB[perfume.family.toLowerCase()] ?? [];
      const mappedSecondary = SCENTO_FAMILY_TO_LAB[(perfume.secondaryFamily ?? '').toLowerCase()] ?? [];
      if (mappedPrimary.includes(balance.dominantFamily)) familyMatch = 1;
      else if (mappedSecondary.includes(balance.dominantFamily)) familyMatch = 0.6;
    }
    const familyAccordScore = 0.55 * accordBaseRatio + 0.2 * accordJaccard + 0.25 * familyMatch;

    // 4. Facet directional proximity
    const refFacets = deriveRefFacets(perfume);
    let sqDist = 0;
    for (const key of facetKeys) {
      const diff = (balance.facets[key] - refFacets[key]) / 100;
      sqDist += diff * diff;
    }
    const rmsDist = Math.sqrt(sqDist / facetKeys.length);
    const facetScore = clamp(1 - rmsDist * 1.45, 0, 1);

    // Combine components
    let combined =
      0.48 * noteOverlapScore +
      0.18 * tierAlignmentScore +
      0.2 * familyAccordScore +
      0.14 * facetScore;

    // Evidence dampener: prevent unrelated blends with 0 shared notes from getting inflated scores
    if (exactMatchCount === 0 && relatedMatchCount === 0) {
      combined *= 0.35;
    } else if (exactMatchCount === 0 && relatedMatchCount === 1) {
      combined *= 0.65;
    } else if (exactMatchCount === 1 && entries.length >= 4 && userCoverage < 0.22) {
      combined *= 0.82;
    }

    const similarityScore = clamp(Math.round(combined * 100), 0, 98);

    // Honest completeness-aware Confidence Score
    const completenessFactor =
      perfume.completeness === 'complete'
        ? 1.0
        : perfume.completeness === 'partial'
        ? 0.78
        : 0.6;
    const richnessFactor = clamp(perfume.canonicalNoteIds.length / 5, 0.35, 1.0);
    const evidenceFactor =
      exactMatchCount + relatedMatchCount * 0.5 >= 2
        ? 1.0
        : exactMatchCount + relatedMatchCount * 0.5 >= 1
        ? 0.84
        : 0.55;
    const confidenceScore = clamp(
      Math.round(completenessFactor * richnessFactor * evidenceFactor * 100),
      20,
      98
    );

    const matchTier: MatchStrengthTier =
      similarityScore >= 48 && exactMatchCount >= 2
        ? 'strong'
        : similarityScore >= 32 && (exactMatchCount >= 1 || relatedMatchCount >= 2)
        ? 'moderate'
        : 'exploratory';

    // Explainable differences
    const userCanonSet = new Set(userCanonicalEntries.map((u) => u.canonicalId));
    const keyDifferences: string[] = [];

    const missingFromUser = perfume.allNoteNames.filter((raw) => {
      const cid = normalizer.resolve(raw).canonicalId;
      return !userCanonSet.has(cid);
    });
    if (missingFromUser.length > 0) {
      keyDifferences.push(
        `Reference includes ${missingFromUser.slice(0, 2).join(' & ')} absent in your blend`
      );
    }

    const matchedIdsSet = new Set(matchedDetails.map((d) => d.canonicalId));
    const extraUserNotes = userCanonicalEntries
      .filter((u) => !matchedIdsSet.has(u.canonicalId))
      .sort((a, b) => b.share - a.share)
      .map((u) => u.entry.note.name);
    if (extraUserNotes.length > 0) {
      keyDifferences.push(`Your formula introduces ${extraUserNotes.slice(0, 2).join(' & ')}`);
    }

    if (!perfume.pyramidComplete) {
      keyDifferences.push(
        `Reference catalog entry lists flat notes only (${perfume.completeness} pyramid metadata)`
      );
    }

    if (keyDifferences.length === 0) {
      keyDifferences.push('Closely aligned materials and structural pyramid proportions');
    }

    const alignedCount = matchedDetails.filter((d) => d.tierAligned).length;
    const explanation =
      exactMatchCount > 0
        ? `${exactMatchCount} exact canonical note${exactMatchCount > 1 ? 's' : ''} matched${
            perfume.pyramidComplete && alignedCount > 0
              ? ` (${alignedCount} in matching pyramid tier)`
              : ''
          }; ${Math.round(userCoverage * 100)}% weighted blend alignment.`
        : relatedMatchCount > 0
        ? `Connected via ${relatedMatchCount} related aromatic material family link${
            relatedMatchCount > 1 ? 's' : ''
          } and ${sharedAccords.slice(0, 2).join(' / ') || 'facet'} character.`
        : `Exploratory proximity based primarily on ${
            sharedAccords.slice(0, 2).join(' / ') || perfume.family
          } character distance.`;

    scored.push({
      perfume,
      similarityScore,
      confidenceScore,
      matchTier,
      tierAlignmentScore: Math.round(tierAlignmentScore * 100),
      sharedNotes,
      matchedDetails,
      sharedAccords,
      keyDifferences,
      explanation,
    });
  }

  scored.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    const rankA = a.perfume.popularityRank ?? 99999;
    const rankB = b.perfume.popularityRank ?? 99999;
    if (rankA !== rankB) return rankA - rankB;
    return a.perfume.id.localeCompare(b.perfume.id);
  });

  const topMatches = scored.slice(0, limit);
  const strongMatches = topMatches.filter(
    (m) => m.matchTier === 'strong' || m.matchTier === 'moderate'
  );
  const exploratoryMatches = topMatches.filter((m) => m.matchTier === 'exploratory');

  const topScore = topMatches[0]?.similarityScore ?? 0;
  const lowMatchNotice =
    strongMatches.length === 0 || topScore < 34
      ? 'No close mainstream match found in the active reference catalog — displaying exploratory structural resemblances only.'
      : null;

  return {
    matches: topMatches,
    strongMatches,
    exploratoryMatches,
    lowMatchNotice,
    searchedCount: totalCatalogCount,
    candidateCount: candidateIndices.length,
    attribution: {
      name: 'Scento Perfume Database (CC BY 4.0)',
      url: 'https://www.scento.com/perfume-database',
      license: 'CC BY 4.0',
    },
  };
}
