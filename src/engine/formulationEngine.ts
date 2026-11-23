import type {
  AtelierMood,
  BalanceDiagnostic,
  BalanceReport,
  BalanceSeverity,
  BlendSelection,
  FacetProfile,
  FragranceNote,
  IntensityPreference,
  MatchResult,
  NormalizedNoteEntry,
  NoteLayer,
  OlfactoryFamily,
  PyramidBreakdown,
  ReferencePerfume,
  ScentProfile,
  TemperaturePreference,
} from '../types/fragrance';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 212, g: 175, b: 110 };
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 212, g: 175, b: 110 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function normalizeBlend(
  selection: BlendSelection,
  notes: FragranceNote[]
): NormalizedNoteEntry[] {
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  const active: { note: FragranceNote; drops: number }[] = [];
  let totalDrops = 0;

  for (const [id, rawDrops] of Object.entries(selection)) {
    const drops = Math.floor(rawDrops);
    const note = noteMap.get(id);
    if (note && Number.isFinite(drops) && drops > 0) {
      active.push({ note, drops });
      totalDrops += drops;
    }
  }

  if (totalDrops === 0 || active.length === 0) {
    return [];
  }

  const layerOrder: Record<NoteLayer, number> = { top: 0, heart: 1, base: 2 };

  return active
    .map(({ note, drops }) => ({
      note,
      drops,
      percentage: Number(((drops / totalDrops) * 100).toFixed(1)),
    }))
    .sort((a, b) => {
      if (layerOrder[a.note.layer] !== layerOrder[b.note.layer]) {
        return layerOrder[a.note.layer] - layerOrder[b.note.layer];
      }
      return b.drops - a.drops;
    });
}

export function computeBalanceReport(
  selection: BlendSelection,
  notes: FragranceNote[]
): BalanceReport {
  const entries = normalizeBlend(selection, notes);
  const totalDrops = entries.reduce((sum, e) => sum + e.drops, 0);

  if (totalDrops === 0) {
    return {
      totalDrops: 0,
      noteCount: 0,
      pyramid: { top: 0, heart: 0, base: 0 },
      dominantAccords: [],
      dominantFamily: null,
      facets: { warmth: 0, freshness: 0, sweetness: 0, dryness: 0, smokiness: 0, floralcy: 0 },
      overallStatus: 'advisory',
      summary: 'Your vessel is empty. Add Top, Heart, and Base drops to inspect pyramid balance.',
      diagnostics: [
        {
          id: 'empty-vessel',
          title: 'Awaiting initial drops',
          detail: 'No notes have been dispensed into the blending vessel yet.',
          suggestion: 'Begin with 2-4 drops of a bright Top note, 3-5 Heart drops, and 3-5 Base drops.',
          severity: 'advisory',
        },
      ],
      blendedColorHex: '#D4AF6E',
    };
  }

  const layerDrops: PyramidBreakdown = { top: 0, heart: 0, base: 0 };
  const accordMap = new Map<string, number>();
  const familyMap = new Map<OlfactoryFamily, number>();
  const facets: FacetProfile = {
    warmth: 0,
    freshness: 0,
    sweetness: 0,
    dryness: 0,
    smokiness: 0,
    floralcy: 0,
  };
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (const { note, drops } of entries) {
    const share = drops / totalDrops;
    layerDrops[note.layer] += drops;

    familyMap.set(note.family, (familyMap.get(note.family) ?? 0) + drops);

    for (const accord of note.accords) {
      accordMap.set(accord, (accordMap.get(accord) ?? 0) + share * 100);
    }

    facets.warmth += note.facets.warmth * share;
    facets.freshness += note.facets.freshness * share;
    facets.sweetness += note.facets.sweetness * share;
    facets.dryness += note.facets.dryness * share;
    facets.smokiness += note.facets.smokiness * share;
    facets.floralcy += note.facets.floralcy * share;

    const rgb = hexToRgb(note.colorHex);
    rSum += rgb.r * share;
    gSum += rgb.g * share;
    bSum += rgb.b * share;
  }

  // Exact integer percentages summing to 100
  const rawTop = (layerDrops.top / totalDrops) * 100;
  const rawHeart = (layerDrops.heart / totalDrops) * 100;
  const topPct = Math.round(rawTop);
  const heartPct = Math.round(rawHeart);
  const basePct = clamp(100 - topPct - heartPct, 0, 100);

  const pyramid: PyramidBreakdown = {
    top: topPct,
    heart: heartPct,
    base: basePct,
  };

  const roundedFacets: FacetProfile = {
    warmth: Math.round(facets.warmth),
    freshness: Math.round(facets.freshness),
    sweetness: Math.round(facets.sweetness),
    dryness: Math.round(facets.dryness),
    smokiness: Math.round(facets.smokiness),
    floralcy: Math.round(facets.floralcy),
  };

  const dominantAccords = Array.from(accordMap.entries())
    .map(([accord, weight]) => ({ accord, weight: Math.round(weight) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  let dominantFamily: OlfactoryFamily | null = null;
  let maxFam = -1;
  for (const [fam, w] of familyMap.entries()) {
    if (w > maxFam) {
      maxFam = w;
      dominantFamily = fam;
    }
  }

  const diagnostics: BalanceDiagnostic[] = [];

  // Layer diagnostics
  if (pyramid.top < 12) {
    diagnostics.push({
      id: 'low-top',
      title: 'Muted opening lift',
      detail: `Top notes represent ${pyramid.top}% of the blend, which may open densely without sparkling projection.`,
      suggestion: 'Add 2-3 drops of Bergamot, Lemon, or Pink Pepper to brighten the initial impression.',
      targetLayer: 'top',
      severity: pyramid.top === 0 ? 'imbalanced' : 'advisory',
    });
  } else if (pyramid.top > 58) {
    diagnostics.push({
      id: 'high-top',
      title: 'High volatility concentration',
      detail: `Top notes make up ${pyramid.top}% of the composition, favoring a brisk flash over structural depth.`,
      suggestion: 'Anchor the volatile opening with Sandalwood, Cedarwood, or Labdanum Amber.',
      targetLayer: 'base',
      severity: 'imbalanced',
    });
  }

  if (pyramid.heart < 16) {
    diagnostics.push({
      id: 'low-heart',
      title: 'Thin mid-palate bridge',
      detail: `Heart notes sit at ${pyramid.heart}%, creating a sharper transition between opening and base.`,
      suggestion: 'Introduce Rose, Cardamom, Lavender, or Iris to weave a cohesive core.',
      targetLayer: 'heart',
      severity: pyramid.heart === 0 ? 'imbalanced' : 'advisory',
    });
  }

  if (pyramid.base < 18) {
    diagnostics.push({
      id: 'low-base',
      title: 'Light structural anchor',
      detail: `Base notes account for only ${pyramid.base}%, giving the blend an airy, fleeting drydown character.`,
      suggestion: 'Deepen the foundation with Musk, Sandalwood, Vetiver, or Tonka Bean.',
      targetLayer: 'base',
      severity: pyramid.base === 0 ? 'imbalanced' : 'advisory',
    });
  } else if (pyramid.base > 66) {
    diagnostics.push({
      id: 'heavy-base',
      title: 'Resinous or heavy base bias',
      detail: `Base notes dominate at ${pyramid.base}%, creating a dense, low-volatility profile.`,
      suggestion: 'Lift the weight with Calabrian Bergamot, Grapefruit, or Alpine Juniper.',
      targetLayer: 'top',
      severity: 'imbalanced',
    });
  }

  // Facet contrast checks
  if (roundedFacets.warmth > 76 && roundedFacets.freshness < 22) {
    diagnostics.push({
      id: 'over-warm',
      title: 'Low crispness contrast',
      detail: `Warmth indexes at ${roundedFacets.warmth}/100 while freshness sits at ${roundedFacets.freshness}/100.`,
      suggestion: 'A touch of citrus rind or green cardamom introduces luminous contrast.',
      targetLayer: 'top',
      severity: 'advisory',
    });
  }

  if (roundedFacets.sweetness > 75 && roundedFacets.dryness < 28) {
    diagnostics.push({
      id: 'high-sweetness',
      title: 'Rich gourmand sweetness',
      detail: `Sweetness measures ${roundedFacets.sweetness}/100 with limited dry wood or mineral counterpoint.`,
      suggestion: 'Balance sweetness with Atlas Cedarwood, Haitian Vetiver, or Atlantic Sea Salt.',
      targetLayer: 'base',
      severity: 'advisory',
    });
  }

  if (entries.length === 1) {
    diagnostics.push({
      id: 'single-note',
      title: 'Soliflore / single-material study',
      detail: 'Only one aromatic material is currently active in the vessel.',
      suggestion: 'Pair with at least 2 complementary layers to build a classic three-tier pyramid.',
      severity: 'advisory',
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      id: 'well-proportioned',
      title: 'Harmonious three-tier architecture',
      detail: `Balanced ${pyramid.top}% Top / ${pyramid.heart}% Heart / ${pyramid.base}% Base distribution with complementary contrast.`,
      suggestion: 'Your composition is well calibrated and ready for distillation or subtle fine-tuning.',
      severity: 'balanced',
    });
  }

  let overallStatus: BalanceSeverity = 'balanced';
  if (diagnostics.some((d) => d.severity === 'imbalanced')) {
    overallStatus = 'imbalanced';
  } else if (diagnostics.some((d) => d.severity === 'advisory')) {
    overallStatus = 'advisory';
  }

  const summary =
    overallStatus === 'balanced'
      ? `Well-balanced ${dominantFamily ?? 'multi-faceted'} composition (${pyramid.top}/${pyramid.heart}/${pyramid.base} pyramid).`
      : overallStatus === 'advisory'
      ? `Expressive ${dominantFamily ?? 'custom'} blend with room for subtle layer tuning.`
      : `Strongly skewed ${pyramid.top}/${pyramid.heart}/${pyramid.base} ratio — review balance guidance below.`;

  return {
    totalDrops,
    noteCount: entries.length,
    pyramid,
    dominantAccords,
    dominantFamily,
    facets: roundedFacets,
    overallStatus,
    summary,
    diagnostics,
    blendedColorHex: rgbToHex(rSum, gSum, bSum),
  };
}

export function computeSimilarityMatches(
  selection: BlendSelection,
  notes: FragranceNote[],
  catalog: ReferencePerfume[]
): MatchResult[] {
  const entries = normalizeBlend(selection, notes);
  if (entries.length === 0) return [];

  const balance = computeBalanceReport(selection, notes);
  const userNoteWeights = new Map(entries.map((e) => [e.note.id, e.percentage / 100]));
  const userAccordSet = new Set<string>();
  for (const e of entries) {
    for (const acc of e.note.accords) {
      userAccordSet.add(acc.toLowerCase());
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

  const results: MatchResult[] = catalog.map((perfume) => {
    // 1. Weighted note overlap (45%)
    const refNoteSet = new Set(perfume.keyNoteIds);
    let userOverlapWeight = 0;
    const sharedNotes: string[] = [];
    for (const e of entries) {
      if (refNoteSet.has(e.note.id)) {
        userOverlapWeight += e.percentage / 100;
        sharedNotes.push(e.note.name);
      }
    }
    const refCoverage = sharedNotes.length / Math.max(1, perfume.keyNoteIds.length);
    const noteScore = 0.6 * userOverlapWeight + 0.4 * refCoverage;

    // 2. Accord Jaccard / overlap (30%)
    const refAccordSet = new Set(perfume.accords.map((a) => a.toLowerCase()));
    const sharedAccords: string[] = [];
    for (const acc of perfume.accords) {
      if (userAccordSet.has(acc.toLowerCase())) {
        sharedAccords.push(acc);
      }
    }
    const unionCount = new Set([...userAccordSet, ...refAccordSet]).size;
    const accordScore = unionCount > 0 ? sharedAccords.length / unionCount : 0;

    // 3. Facet vector proximity (25%)
    let sqDist = 0;
    for (const key of facetKeys) {
      const diff = (balance.facets[key] - perfume.facets[key]) / 100;
      sqDist += diff * diff;
    }
    const rmsDist = Math.sqrt(sqDist / facetKeys.length);
    const facetScore = clamp(1 - rmsDist * 1.4, 0, 1);

    // Family alignment bonus (small tie-breaker)
    const familyBonus = balance.dominantFamily === perfume.family ? 0.05 : 0;

    const rawScore = (0.45 * noteScore + 0.30 * accordScore + 0.25 * facetScore + familyBonus) * 100;
    const similarityScore = clamp(Math.round(rawScore), 12, 97);

    // Key differences
    const keyDifferences: string[] = [];
    const missingRefSignatures = perfume.keyNoteIds
      .filter((id) => !userNoteWeights.has(id))
      .map((id) => notes.find((n) => n.id === id)?.name)
      .filter((n): n is string => Boolean(n));

    if (missingRefSignatures.length > 0) {
      keyDifferences.push(
        `Reference emphasizes ${missingRefSignatures.slice(0, 2).join(' & ')} absent in your blend`
      );
    }

    const extraUserNotes = entries
      .filter((e) => !refNoteSet.has(e.note.id))
      .sort((a, b) => b.percentage - a.percentage)
      .map((e) => e.note.name);

    if (extraUserNotes.length > 0) {
      keyDifferences.push(`Your blend introduces ${extraUserNotes.slice(0, 2).join(' & ')}`);
    }

    const warmthDelta = balance.facets.warmth - perfume.facets.warmth;
    if (Math.abs(warmthDelta) >= 18) {
      keyDifferences.push(
        warmthDelta > 0
          ? 'Your composition leans noticeably warmer and richer'
          : 'Your composition reads cooler and lighter'
      );
    }

    if (keyDifferences.length === 0) {
      keyDifferences.push('Closely aligned facet proportions across warmth, dryness, and lift');
    }

    return {
      perfume,
      similarityScore,
      sharedNotes,
      sharedAccords,
      keyDifferences,
    };
  });

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}

export function deriveMoodAndSeasons(balance: BalanceReport): {
  moodTags: string[];
  seasonTags: string[];
} {
  const { facets, dominantFamily } = balance;
  const moodTags: string[] = [];
  const seasonTags: string[] = [];

  if (facets.freshness >= 60) moodTags.push('Sunlit Clarity');
  if (facets.warmth >= 65) moodTags.push('Nocturnal Warmth');
  if (facets.smokiness >= 42) moodTags.push('Smoky Atelier');
  if (facets.floralcy >= 55) moodTags.push('Velvet Botanical');
  if (facets.dryness >= 65) moodTags.push('Architectural Dry');
  if (moodTags.length === 0) moodTags.push('Balanced Signature');

  if (facets.freshness >= 58 && facets.warmth < 60) {
    seasonTags.push('Spring', 'Summer');
  } else if (facets.warmth >= 65 || facets.smokiness >= 45) {
    seasonTags.push('Autumn', 'Winter');
  } else {
    seasonTags.push('Spring', 'Autumn');
  }

  if (dominantFamily === 'Citrus' && !seasonTags.includes('Summer')) {
    seasonTags.push('Summer');
  }

  return {
    moodTags: moodTags.slice(0, 3),
    seasonTags: seasonTags.slice(0, 3),
  };
}

export function buildScentProfile(
  preferredFamilies: OlfactoryFamily[],
  temperaturePreference: TemperaturePreference,
  intensityPreference: IntensityPreference,
  mood: AtelierMood,
  notes: FragranceNote[]
): ScentProfile {
  const famSet = new Set(preferredFamilies);

  const scored = notes.map((note) => {
    let score = 0;
    if (famSet.has(note.family)) score += 45;

    if (temperaturePreference === 'fresh') {
      score += note.facets.freshness * 0.4 - note.facets.warmth * 0.15;
    } else if (temperaturePreference === 'warm') {
      score += note.facets.warmth * 0.4 - note.facets.freshness * 0.1;
    } else {
      score += 20;
    }

    if (intensityPreference === 'sheer') {
      score += (100 - note.intensity) * 0.25;
    } else if (intensityPreference === 'opulent') {
      score += note.intensity * 0.25;
    } else {
      score += 12;
    }

    return { note, score };
  });

  const pickBest = (layer: NoteLayer, count: number): FragranceNote[] => {
    const candidates = scored
      .filter((s) => s.note.layer === layer)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.note);

    const chosen: FragranceNote[] = [];
    const seenFamilies = new Set<OlfactoryFamily>();

    // First pass: pick highest scoring note from distinct selected families
    for (const fam of preferredFamilies) {
      if (chosen.length >= count) break;
      const match = candidates.find((c) => c.family === fam && !chosen.includes(c));
      if (match) {
        chosen.push(match);
        seenFamilies.add(match.family);
      }
    }

    // Second pass: fill remaining slots with highest overall scores
    for (const c of candidates) {
      if (chosen.length >= count) break;
      if (!chosen.includes(c)) {
        chosen.push(c);
      }
    }

    return chosen;
  };

  const recommended = [
    ...pickBest('top', 2),
    ...pickBest('heart', 2),
    ...pickBest('base', 2),
  ];

  const topFamilies = preferredFamilies.slice(0, 2);
  const joiner = topFamilies.some((f) => f.includes('&')) ? ' / ' : ' & ';
  const familyText = topFamilies.length > 0 ? topFamilies.join(joiner) : 'Multi-Faceted';
  const tempLabel =
    temperaturePreference === 'fresh'
      ? 'Luminous Crisp'
      : temperaturePreference === 'warm'
      ? 'Amber-Warmed'
      : 'Equilibrium';

  return {
    preferredFamilies,
    temperaturePreference,
    intensityPreference,
    mood,
    recommendedNoteIds: recommended.map((n) => n.id),
    label: `${tempLabel} · ${familyText}`,
    summary: `Tailored for ${mood} with a ${intensityPreference} presence across ${familyText.toLowerCase()} accords.`,
  };
}

export function generateDeterministicCritique(
  fragranceName: string,
  entries: NormalizedNoteEntry[],
  balance: BalanceReport,
  topMatch: MatchResult | null
): string {
  const topNotes = entries.filter((e) => e.note.layer === 'top').map((e) => e.note.name);
  const heartNotes = entries.filter((e) => e.note.layer === 'heart').map((e) => e.note.name);
  const baseNotes = entries.filter((e) => e.note.layer === 'base').map((e) => e.note.name);

  const openingClause =
    topNotes.length > 0
      ? `opens with ${topNotes.slice(0, 2).join(' and ')} (${balance.pyramid.top}% top share)`
      : `bypasses a volatile citrus opening in favor of immediate heart density`;

  const heartClause =
    heartNotes.length > 0
      ? `transitions through a ${heartNotes.slice(0, 2).join(' and ')} core (${balance.pyramid.heart}% heart share)`
      : `bridges quickly toward its drydown without a dedicated mid-palate anchor`;

  const baseClause =
    baseNotes.length > 0
      ? `settles onto ${baseNotes.slice(0, 2).join(' and ')} (${balance.pyramid.base}% base share)`
      : `remains intentionally light without a heavy resinous base`;

  const accordText =
    balance.dominantAccords.length > 0
      ? balance.dominantAccords
          .slice(0, 2)
          .map((a) => a.accord.toLowerCase())
          .join(' and ')
      : 'nuanced';

  const matchSentence = topMatch
    ? `Within our internal algorithmic catalog, this structure shares ${topMatch.similarityScore}% profile proximity with ${topMatch.perfume.name} (${topMatch.perfume.house})${
        topMatch.sharedNotes.length > 0
          ? `, anchored by shared ${topMatch.sharedNotes.slice(0, 2).join(' and ')}.`
          : '.'
      }`
    : '';

  return `${fragranceName || 'This composition'} ${openingClause}, ${heartClause}, and ${baseClause}. Driven by ${accordText} facets, its balance reads ${balance.overallStatus === 'balanced' ? 'composed and structurally poised' : 'characterful with clear directional emphasis'}. ${matchSentence}`.trim();
}

export function generateFormulaCode(entries: NormalizedNoteEntry[]): string {
  const seed = entries
    .map((e) => `${e.note.id}:${e.drops}`)
    .sort()
    .join('|');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `VPL-${hex}`;
}
