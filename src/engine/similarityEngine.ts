import type {
  BalanceReport,
  BlendSelection,
  FacetProfile,
  FragranceNote,
  MatchApiResponse,
  MatchedNoteDetail,
  MatchResult,
  MatchScoreBreakdown,
  MatchStrengthTier,
  NoteLayer,
  OlfactoryFamily,
  ReferencePerfume,
} from '../types/fragrance';
import { computeBalanceReport, normalizeBlend } from './formulationEngine';
import { NoteNormalizer } from './noteNormalization';

export const ALGORITHM_VERSION = 'v2.1-hybrid-ratio';

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

export function validateMatchResult(
  result: MatchResult,
  claimedUserCanonicalIds: Set<string>,
  userOnlyCanonicalIds: Set<string>,
  refOnlyCanonicalIds: Set<string>
): boolean {
  if (
    !Number.isFinite(result.similarityScore) ||
    result.similarityScore < 0 ||
    result.similarityScore > 100
  ) {
    console.error(`[SimilarityEngine] Invalid similarityScore for ${result.perfume.id}: ${result.similarityScore}`);
    return false;
  }
  if (
    !Number.isFinite(result.confidenceScore) ||
    result.confidenceScore < 0 ||
    result.confidenceScore > 100
  ) {
    console.error(`[SimilarityEngine] Invalid confidenceScore for ${result.perfume.id}: ${result.confidenceScore}`);
    return false;
  }
  if (
    !Number.isFinite(result.tierAlignmentScore) ||
    result.tierAlignmentScore < 0 ||
    result.tierAlignmentScore > 100
  ) {
    console.error(`[SimilarityEngine] Invalid tierAlignmentScore for ${result.perfume.id}: ${result.tierAlignmentScore}`);
    return false;
  }

  const sharedRefSet = new Set(result.sharedCanonicalIds ?? result.matchedDetails.map((d) => d.canonicalId));
  if (sharedRefSet.size !== result.matchedDetails.length) {
    console.error(`[SimilarityEngine] Duplicate canonical ID in matchedDetails for ${result.perfume.id}`);
    return false;
  }

  for (const cid of sharedRefSet) {
    if (refOnlyCanonicalIds.has(cid)) {
      console.error(`[SimilarityEngine] Contradictory canonical ID '${cid}' in both shared and refOnly for ${result.perfume.id}`);
      return false;
    }
  }

  for (const ucid of claimedUserCanonicalIds) {
    if (userOnlyCanonicalIds.has(ucid)) {
      console.error(`[SimilarityEngine] Contradictory user canonical ID '${ucid}' in both claimed and userOnly for ${result.perfume.id}`);
      return false;
    }
  }

  return true;
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
      algorithmVersion: ALGORITHM_VERSION,
      attribution: {
        name: 'Scento Perfume Database (CC BY 4.0)',
        url: 'https://www.scento.com/perfume-database',
        license: 'CC BY 4.0',
      },
    };
  }

  const balance: BalanceReport = computeBalanceReport(selection, notes);

  // Resolve and deduplicate user's notes into canonical IDs with exact relative shares
  const userCanonAgg = new Map<
    string,
    {
      entry: (typeof entries)[number];
      canonicalId: string;
      relatedIds: string[];
      idf: number;
      share: number;
    }
  >();

  for (const entry of entries) {
    const resolved = normalizer.resolve(entry.note.name);
    const byId = normalizer.resolve(entry.note.id);
    const canonicalId =
      resolved.matchSource !== 'slug-fallback' ? resolved.canonicalId : byId.canonicalId;
    const relatedIds = Array.from(
      new Set([...resolved.relatedIds, ...byId.relatedIds, ...normalizer.getRelatedIds(canonicalId)])
    ).filter((rid) => rid !== canonicalId);
    const df = index.noteDocumentFrequency.get(canonicalId) ?? 0;
    const idf = 1 + Math.log((totalCatalogCount + 1) / (df + 1));
    const share = entry.percentage / 100;

    const existing = userCanonAgg.get(canonicalId);
    if (existing) {
      const combinedShare = existing.share + share;
      const keepNew = share > existing.share;
      userCanonAgg.set(canonicalId, {
        entry: keepNew ? entry : existing.entry,
        canonicalId,
        relatedIds: Array.from(new Set([...existing.relatedIds, ...relatedIds])),
        idf,
        share: combinedShare,
      });
    } else {
      userCanonAgg.set(canonicalId, {
        entry,
        canonicalId,
        relatedIds,
        idf,
        share,
      });
    }
  }

  const userCanonicalEntries = Array.from(userCanonAgg.values());
  const userTotalShare = Math.max(
    1e-6,
    userCanonicalEntries.reduce((sum, u) => sum + u.share, 0)
  );
  for (const u of userCanonicalEntries) {
    u.share = u.share / userTotalShare;
  }

  // Share-weighted user pyramid distribution P_user = (P_top, P_heart, P_base)
  const userPyramidVec = {
    top: balance.pyramid.top / 100,
    heart: balance.pyramid.heart / 100,
    base: balance.pyramid.base / 100,
  };
  const userActiveTiers = [
    balance.pyramid.top,
    balance.pyramid.heart,
    balance.pyramid.base,
  ].filter((v) => v > 0).length;

  // Share-weighted family and accord distributions
  const userFamilyWeights = new Map<OlfactoryFamily, number>();
  const userAccordWeightMap = new Map<string, number>();
  for (const u of userCanonicalEntries) {
    userFamilyWeights.set(
      u.entry.note.family,
      (userFamilyWeights.get(u.entry.note.family) ?? 0) + u.share
    );
    for (const acc of u.entry.note.accords) {
      const key = acc.toLowerCase();
      userAccordWeightMap.set(key, (userAccordWeightMap.get(key) ?? 0) + u.share);
    }
  }
  const userTotalAccordWeight = Math.max(
    1e-6,
    Array.from(userAccordWeightMap.values()).reduce((s, w) => s + w, 0)
  );

  // 1. Candidate retrieval via inverted indexes across the entire active catalog
  const candidateIndexSet = new Set<number>();
  for (const u of userCanonicalEntries) {
    for (const idx of index.noteToPerfumeIndices.get(u.canonicalId) ?? []) {
      candidateIndexSet.add(idx);
    }
    for (const rel of u.relatedIds) {
      for (const idx of index.noteToPerfumeIndices.get(rel) ?? []) {
        candidateIndexSet.add(idx);
      }
    }
    for (const idx of index.relatedToPerfumeIndices.get(u.canonicalId) ?? []) {
      candidateIndexSet.add(idx);
    }
  }

  const candidateIndices =
    candidateIndexSet.size >= 20
      ? Array.from(candidateIndexSet)
      : index.perfumes.map((_, i) => i);

  const userTotalIdfMass = userCanonicalEntries.reduce(
    (sum, u) => sum + u.share * u.idf,
    0
  );

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
    const refTopSet = new Set(perfume.topCanonicalIds);
    const refHeartSet = new Set(perfume.heartCanonicalIds);
    const refBaseSet = new Set(perfume.baseCanonicalIds);

    // Build deduplicated ordered canonical note dictionary for the reference
    const refUniqueMap = new Map<string, string>();
    for (const rawName of perfume.allNoteNames) {
      const cid = normalizer.resolve(rawName).canonicalId;
      if (!refUniqueMap.has(cid)) {
        const matName = normalizer.getMaterial(cid)?.name;
        refUniqueMap.set(cid, matName || rawName);
      }
    }
    for (const cid of perfume.canonicalNoteIds) {
      if (!refUniqueMap.has(cid)) {
        refUniqueMap.set(cid, normalizer.getMaterial(cid)?.name ?? cid);
      }
    }

    const refCanonIds = Array.from(refUniqueMap.keys());
    const refCanonSet = new Set(refCanonIds);

    const getRefLayer = (
      cid: string,
      preferredLayer?: NoteLayer
    ): NoteLayer | 'unspecified' => {
      if (preferredLayer === 'top' && refTopSet.has(cid)) return 'top';
      if (preferredLayer === 'heart' && refHeartSet.has(cid)) return 'heart';
      if (preferredLayer === 'base' && refBaseSet.has(cid)) return 'base';
      if (refTopSet.has(cid)) return 'top';
      if (refHeartSet.has(cid)) return 'heart';
      if (refBaseSet.has(cid)) return 'base';
      return 'unspecified';
    };

    // Precompute reference IDF mass and uniform-IDF prior q_c (no fabricated note percentages)
    let refTotalIdfMass = 0;
    const refIdfByCid = new Map<string, number>();
    for (const cid of refCanonIds) {
      const df = index.noteDocumentFrequency.get(cid) ?? 0;
      const idf = 1 + Math.log((totalCatalogCount + 1) / (df + 1));
      refIdfByCid.set(cid, idf);
      refTotalIdfMass += idf;
    }

    // Two-pass disjoint canonical matching:
    // Pass 1 claims all exact canonical matches; Pass 2 matches remaining user notes to unclaimed related ref notes
    const claimedUserIds = new Set<string>();
    const claimedRefIds = new Set<string>();
    const matchedDetails: MatchedNoteDetail[] = [];
    const sharedNotes: string[] = [];

    let matchedUserWeightedMass = 0;
    let matchedRefIdfMass = 0;
    let bhattacharyyaRefOverlap = 0;
    let tierScoreSum = 0;
    let tierWeightSum = 0;
    let exactMatchCount = 0;
    let relatedMatchCount = 0;

    // Pass 1: exact canonical matches
    for (const u of userCanonicalEntries) {
      if (!refCanonSet.has(u.canonicalId) || claimedRefIds.has(u.canonicalId)) continue;

      claimedUserIds.add(u.canonicalId);
      claimedRefIds.add(u.canonicalId);

      const weight = u.share * u.idf;
      const refLayer = getRefLayer(u.canonicalId, u.entry.note.layer);
      const tierProx = perfume.pyramidComplete
        ? tierProximity(u.entry.note.layer, refLayer)
        : 0.55;
      const aligned = perfume.pyramidComplete && refLayer === u.entry.note.layer;

      const qRef =
        refTotalIdfMass > 0 ? (refIdfByCid.get(u.canonicalId) ?? u.idf) / refTotalIdfMass : 0;

      exactMatchCount += 1;
      matchedUserWeightedMass += weight;
      matchedRefIdfMass += refIdfByCid.get(u.canonicalId) ?? u.idf;
      bhattacharyyaRefOverlap += Math.sqrt(u.share * qRef);
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
    }

    // Pass 2: related aromatic material cousins (only unclaimed user + unclaimed ref canonical IDs)
    for (const u of userCanonicalEntries) {
      if (claimedUserIds.has(u.canonicalId)) continue;
      const relatedHitId = u.relatedIds.find(
        (rid) => refCanonSet.has(rid) && !claimedRefIds.has(rid)
      );
      if (!relatedHitId) continue;

      claimedUserIds.add(u.canonicalId);
      claimedRefIds.add(relatedHitId);

      const weight = u.share * u.idf;
      const refLayer = getRefLayer(relatedHitId, u.entry.note.layer);
      const tierProx = perfume.pyramidComplete
        ? tierProximity(u.entry.note.layer, refLayer)
        : 0.48;
      const relIdf = refIdfByCid.get(relatedHitId) ?? u.idf;
      const qRef = refTotalIdfMass > 0 ? relIdf / refTotalIdfMass : 0;

      relatedMatchCount += 1;
      matchedUserWeightedMass += weight * 0.5;
      matchedRefIdfMass += relIdf * 0.5;
      bhattacharyyaRefOverlap += 0.55 * Math.sqrt(u.share * qRef);
      tierScoreSum += weight * 0.5 * tierProx;
      tierWeightSum += weight * 0.5;

      const relMat = normalizer.getMaterial(relatedHitId);
      sharedNotes.push(`${u.entry.note.name} (~${relMat?.name ?? refUniqueMap.get(relatedHitId) ?? relatedHitId})`);
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

    // Component 1: User Formula Coverage (share * IDF weighted)
    const userNoteCoverage = clamp(
      userTotalIdfMass > 0 ? matchedUserWeightedMass / userTotalIdfMass : 0,
      0,
      1
    );

    // Component 2: Reference Coverage + Ratio-Sensitive Bhattacharyya Precision
    const refIdfRecall = refTotalIdfMass > 0 ? matchedRefIdfMass / refTotalIdfMass : 0;
    const refPrecision = clamp(
      0.5 * refIdfRecall + 0.5 * clamp(bhattacharyyaRefOverlap, 0, 1),
      0,
      1
    );

    // Component 3: Per-Note Layer Alignment (share-weighted)
    const tierNoteAlignment =
      tierWeightSum > 0 ? clamp(tierScoreSum / tierWeightSum, 0, 1) : 0;

    // Component 4: Documented Pyramid Concentration Distribution Match (P_user vs P_ref)
    let pyramidDistribution = 0.42; // Honest neutral prior for unrecorded pyramids
    if (perfume.pyramidComplete) {
      const nT = perfume.topCanonicalIds.length;
      const nH = perfume.heartCanonicalIds.length;
      const nB = perfume.baseCanonicalIds.length;
      const nTotal = Math.max(1, nT + nH + nB);
      const refPyr = {
        top: nT / nTotal,
        heart: nH / nTotal,
        base: nB / nTotal,
      };
      const l1Dist =
        Math.abs(userPyramidVec.top - refPyr.top) +
        Math.abs(userPyramidVec.heart - refPyr.heart) +
        Math.abs(userPyramidVec.base - refPyr.base);
      pyramidDistribution = clamp(1 - 0.5 * l1Dist, 0, 1);
    } else if (perfume.completeness === 'partial') {
      pyramidDistribution = 0.52;
    }

    // Component 5: Share-Weighted Olfactory Family & Accord Compatibility
    const sharedAccords: string[] = [];
    let matchedUserAccordWeight = 0;
    for (const acc of perfume.accords) {
      const lower = acc.toLowerCase();
      const syns = CHARACTER_SYNONYMS[lower] ?? [lower];
      let bestSynWeight = 0;
      for (const s of syns) {
        const w = userAccordWeightMap.get(s) ?? 0;
        if (w > bestSynWeight) bestSynWeight = w;
      }
      if (bestSynWeight > 0) {
        sharedAccords.push(acc);
        matchedUserAccordWeight += bestSynWeight;
      }
    }
    const weightedAccordAlignment = clamp(
      matchedUserAccordWeight / userTotalAccordWeight,
      0,
      1
    );
    const refAccordBreadth =
      perfume.accords.length > 0
        ? clamp(sharedAccords.length / Math.min(perfume.accords.length, 4), 0, 1)
        : 0;

    const mappedPrimary = SCENTO_FAMILY_TO_LAB[perfume.family.toLowerCase()] ?? [];
    const mappedSecondary = SCENTO_FAMILY_TO_LAB[(perfume.secondaryFamily ?? '').toLowerCase()] ?? [];
    let primaryFamMass = 0;
    for (const fam of mappedPrimary) {
      primaryFamMass = Math.max(primaryFamMass, userFamilyWeights.get(fam) ?? 0);
    }
    let secondaryFamMass = 0;
    for (const fam of mappedSecondary) {
      secondaryFamMass = Math.max(secondaryFamMass, userFamilyWeights.get(fam) ?? 0);
    }
    const familyScore = clamp(primaryFamMass + 0.55 * secondaryFamMass, 0, 1);

    const familyAccord = clamp(
      0.42 * familyScore + 0.34 * weightedAccordAlignment + 0.24 * refAccordBreadth,
      0,
      1
    );

    // Component 6: Share-Weighted Facet Directional Proximity
    const refFacets = deriveRefFacets(perfume);
    let sqDist = 0;
    for (const key of facetKeys) {
      const diff = (balance.facets[key] - refFacets[key]) / 100;
      sqDist += diff * diff;
    }
    const rmsDist = Math.sqrt(sqDist / facetKeys.length);
    const facetProximity = clamp(1 - rmsDist * 1.45, 0, 1);

    // Explainable weighted hybrid total (weights sum to 1.00)
    let combined =
      0.24 * userNoteCoverage +
      0.18 * refPrecision +
      0.10 * tierNoteAlignment +
      0.16 * pyramidDistribution +
      0.18 * familyAccord +
      0.14 * facetProximity;

    // Honest evidence & completeness adjustments
    if (exactMatchCount === 0 && relatedMatchCount === 0) {
      combined *= 0.35;
    } else if (exactMatchCount === 0 && relatedMatchCount === 1) {
      combined *= 0.65;
    } else if (exactMatchCount === 1 && entries.length >= 4 && userNoteCoverage < 0.22) {
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
    const richnessFactor = clamp(refCanonIds.length / 5, 0.35, 1.0);
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
      similarityScore >= 46 && (exactMatchCount >= 2 || (exactMatchCount >= 1 && entries.length <= 2 && similarityScore >= 52))
        ? 'strong'
        : similarityScore >= 30 && (exactMatchCount >= 1 || relatedMatchCount >= 2)
        ? 'moderate'
        : 'exploratory';

    // Disjoint partition sets for explainability
    const userOnlyEntries = userCanonicalEntries
      .filter((u) => !claimedUserIds.has(u.canonicalId))
      .sort((a, b) => b.share - a.share);
    const userOnlyCanonicalIds = new Set(userOnlyEntries.map((u) => u.canonicalId));
    const userOnlyNoteNames = userOnlyEntries.map((u) => u.entry.note.name);

    const refOnlyEntries = Array.from(refUniqueMap.entries()).filter(
      ([cid]) => !claimedRefIds.has(cid)
    );
    const refOnlyCanonicalIds = new Set(refOnlyEntries.map(([cid]) => cid));
    const refOnlyNoteNames = refOnlyEntries.map(([, display]) => display);

    const keyDifferences: string[] = [];
    if (refOnlyNoteNames.length > 0) {
      keyDifferences.push(
        `Reference includes ${refOnlyNoteNames.slice(0, 2).join(' & ')} absent in your blend`
      );
    }
    if (userOnlyNoteNames.length > 0) {
      keyDifferences.push(
        `Your formula introduces ${userOnlyNoteNames.slice(0, 2).join(' & ')}`
      );
    }
    if (!perfume.pyramidComplete) {
      keyDifferences.push(
        `Reference catalog entry lists flat notes only (${perfume.completeness} pyramid metadata)`
      );
    }
    if (userActiveTiers === 1 && perfume.pyramidComplete) {
      keyDifferences.push(
        `Single-tier user formula concentrates 100% in one layer vs full 3-tier reference pyramid`
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
          }; ${Math.round(userNoteCoverage * 100)}% weighted blend alignment.`
        : relatedMatchCount > 0
        ? `Connected via ${relatedMatchCount} related aromatic material family link${
            relatedMatchCount > 1 ? 's' : ''
          } and ${sharedAccords.slice(0, 2).join(' / ') || 'facet'} character.`
        : `Exploratory proximity based primarily on ${
            sharedAccords.slice(0, 2).join(' / ') || perfume.family
          } character distance.`;

    const scoreBreakdown: MatchScoreBreakdown = {
      userNoteCoverage: Math.round(userNoteCoverage * 100),
      refPrecision: Math.round(refPrecision * 100),
      tierNoteAlignment: Math.round(tierNoteAlignment * 100),
      pyramidDistribution: Math.round(pyramidDistribution * 100),
      familyAccord: Math.round(familyAccord * 100),
      facetProximity: Math.round(facetProximity * 100),
    };

    const candidateResult: MatchResult = {
      perfume,
      similarityScore,
      confidenceScore,
      matchTier,
      tierAlignmentScore: Math.round(tierNoteAlignment * 100),
      sharedNotes,
      sharedCanonicalIds: Array.from(claimedRefIds),
      userOnlyNoteNames,
      refOnlyNoteNames,
      matchedDetails,
      sharedAccords,
      keyDifferences,
      explanation,
      scoreBreakdown,
    };

    if (
      validateMatchResult(
        candidateResult,
        claimedUserIds,
        userOnlyCanonicalIds,
        refOnlyCanonicalIds
      )
    ) {
      scored.push(candidateResult);
    }
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
    algorithmVersion: ALGORITHM_VERSION,
    attribution: {
      name: 'Scento Perfume Database (CC BY 4.0)',
      url: 'https://www.scento.com/perfume-database',
      license: 'CC BY 4.0',
    },
  };
}
