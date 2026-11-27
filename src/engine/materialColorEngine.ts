import type {
  MaterialViscosityClass,
  MaterialVisualMetadata,
  NormalizedNoteEntry,
  VesselLiquidAppearance,
} from '../types/fragrance';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function makeMeta(
  meta: Omit<MaterialVisualMetadata, 'transparency'>
): MaterialVisualMetadata {
  const opacity = clamp(meta.opacity, 0.05, 0.95);
  return {
    ...meta,
    opacity,
    transparency: Number((1 - opacity).toFixed(2)),
  };
}

/**
 * Structured visual & optical liquid metadata for all 27 lab materials.
 * Grounded in real essential oil, expressed peel, resinoid, absolute, or
 * diluted tincture appearances rather than flower/wood color stereotypes.
 * Variable natural batches and synthetic accords are explicitly marked.
 */
export const MATERIAL_VISUAL_METADATA: Record<string, MaterialVisualMetadata> = {
  // TOP NOTES
  bergamot: makeMeta({
    materialId: 'bergamot',
    displayName: 'Calabrian Bergamot',
    tier: 'top',
    documentedLiquidColor: 'Pale olive-yellow to yellow-green expressed peel oil',
    documentedColorRange: ['#DDD272', '#BFC058'],
    visualColorHex: '#CEC763',
    opacity: 0.34,
    visualIntensity: 0.56,
    viscosityClass: 'water-thin',
    colorSource: 'Expressed Citrus bergamia rind essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#5E582C',
    labelToneHex: '#CEC763',
  }),
  lemon: makeMeta({
    materialId: 'lemon',
    displayName: 'Amalfi Lemon',
    tier: 'top',
    documentedLiquidColor: 'Clear pale straw-yellow cold-pressed peel oil',
    documentedColorRange: ['#EFE694', '#DACA5A'],
    visualColorHex: '#E6DA78',
    opacity: 0.24,
    visualIntensity: 0.36,
    viscosityClass: 'water-thin',
    colorSource: 'Expressed Citrus limon peel oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#635C30',
    labelToneHex: '#E6DA78',
  }),
  mandarin: makeMeta({
    materialId: 'mandarin',
    displayName: 'Blood Mandarin',
    tier: 'top',
    documentedLiquidColor: 'Warm amber-orange to reddish-orange expressed peel oil',
    documentedColorRange: ['#DF893D', '#C96A27'],
    visualColorHex: '#D87D34',
    opacity: 0.44,
    visualIntensity: 0.78,
    viscosityClass: 'light-oil',
    colorSource: 'Cold-pressed red mandarin rind essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#693B1B',
    labelToneHex: '#D87D34',
  }),
  'pink-pepper': makeMeta({
    materialId: 'pink-pepper',
    displayName: 'Pink Peppercorn',
    tier: 'top',
    documentedLiquidColor: 'Pale amber-rose to light straw CO2 extract',
    documentedColorRange: ['#E2B29E', '#CC8878'],
    visualColorHex: '#D49888',
    opacity: 0.32,
    visualIntensity: 0.54,
    viscosityClass: 'light-oil',
    colorSource: 'Schinus molle CO2 / steam-distilled berry oil reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#613E39',
    labelToneHex: '#D49888',
  }),
  grapefruit: makeMeta({
    materialId: 'grapefruit',
    displayName: 'Ruby Grapefruit',
    tier: 'top',
    documentedLiquidColor: 'Pale golden-yellow to faint peach-tinted rind oil',
    documentedColorRange: ['#E8CC88', '#D8A26A'],
    visualColorHex: '#DFB678',
    opacity: 0.28,
    visualIntensity: 0.44,
    viscosityClass: 'water-thin',
    colorSource: 'Cold-pressed Citrus paradisi peel oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#645233',
    labelToneHex: '#DFB678',
  }),
  neroli: makeMeta({
    materialId: 'neroli',
    displayName: 'Tunisian Neroli',
    tier: 'top',
    documentedLiquidColor: 'Pale yellow to light amber-gold steam-distilled blossom oil',
    documentedColorRange: ['#EAE0B0', '#D4BE78'],
    visualColorHex: '#DFCE92',
    opacity: 0.26,
    visualIntensity: 0.42,
    viscosityClass: 'water-thin',
    colorSource: 'Steam-distilled Citrus aurantium blossom essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#5E5538',
    labelToneHex: '#DFCE92',
  }),
  juniper: makeMeta({
    materialId: 'juniper',
    displayName: 'Alpine Juniper Berry',
    tier: 'top',
    documentedLiquidColor: 'Nearly colorless to very pale greenish-straw oil',
    documentedColorRange: ['#EAECE1', '#CFD6C4'],
    visualColorHex: '#DCE2D3',
    opacity: 0.16,
    visualIntensity: 0.24,
    viscosityClass: 'water-thin',
    colorSource: 'Steam-distilled Juniperus communis berry oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#434C46',
    labelToneHex: '#8FB0A9',
  }),
  petitgrain: makeMeta({
    materialId: 'petitgrain',
    displayName: 'Paraguayan Petitgrain',
    tier: 'top',
    documentedLiquidColor: 'Pale yellow-amber leaf & twig distillate',
    documentedColorRange: ['#DDD89E', '#B7B872'],
    visualColorHex: '#C7C682',
    opacity: 0.28,
    visualIntensity: 0.46,
    viscosityClass: 'water-thin',
    colorSource: 'Steam-distilled bitter orange leaf/twig oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#4B5439',
    labelToneHex: '#94B383',
  }),
  'sea-salt': makeMeta({
    materialId: 'sea-salt',
    displayName: 'Atlantic Sea Salt',
    tier: 'top',
    documentedLiquidColor: 'Colorless clear mineral-salicylate accord dilution',
    documentedColorRange: ['#F2F5F7', '#E3EBEF'],
    visualColorHex: '#EBF0F3',
    opacity: 0.11,
    visualIntensity: 0.16,
    viscosityClass: 'water-thin',
    colorSource: 'Atelier mineral & marine aroma-chemical accord estimate',
    colorConfidence: 'estimated',
    bottleTintHex: '#3C4B52',
    labelToneHex: '#9EC0CE',
  }),

  // HEART NOTES
  rose: makeMeta({
    materialId: 'rose',
    displayName: 'Damask Rose',
    tier: 'heart',
    documentedLiquidColor: 'Warm reddish-amber to copper-rose solvent absolute',
    documentedColorRange: ['#BA5C50', '#96423E'],
    visualColorHex: '#AB5048',
    opacity: 0.58,
    visualIntensity: 0.96,
    viscosityClass: 'medium-oil',
    colorSource: 'Rosa damascena solvent absolute / otto visual reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#5C2C2A',
    labelToneHex: '#C86472',
  }),
  jasmine: makeMeta({
    materialId: 'jasmine',
    displayName: 'Jasmine Sambac',
    tier: 'heart',
    documentedLiquidColor: 'Deep golden-amber to reddish-orange flower absolute (unlike white petals)',
    documentedColorRange: ['#CC8838', '#A86125'],
    visualColorHex: '#BD772E',
    opacity: 0.62,
    visualIntensity: 0.98,
    viscosityClass: 'medium-oil',
    colorSource: 'Jasminum sambac concrete/absolute amber darkening reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#63401D',
    labelToneHex: '#E2B66C',
  }),
  lavender: makeMeta({
    materialId: 'lavender',
    displayName: 'Haute-Provence Lavender',
    tier: 'heart',
    documentedLiquidColor: 'Colorless to very pale golden-straw steam oil (not purple)',
    documentedColorRange: ['#EDE8CC', '#D5CCA0'],
    visualColorHex: '#E2DAB4',
    opacity: 0.18,
    visualIntensity: 0.28,
    viscosityClass: 'water-thin',
    colorSource: 'Lavandula angustifolia steam-distilled oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#4B455C',
    labelToneHex: '#A799CF',
  }),
  cardamom: makeMeta({
    materialId: 'cardamom',
    displayName: 'Green Cardamom',
    tier: 'heart',
    documentedLiquidColor: 'Pale yellow to light golden-green seed oil',
    documentedColorRange: ['#DED7A2', '#B7B470'],
    visualColorHex: '#CBC786',
    opacity: 0.26,
    visualIntensity: 0.42,
    viscosityClass: 'light-oil',
    colorSource: 'Elettaria cardamomum seed essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#46523E',
    labelToneHex: '#8AA37B',
  }),
  iris: makeMeta({
    materialId: 'iris',
    displayName: 'Florentine Iris Butter',
    tier: 'heart',
    documentedLiquidColor: 'Warm ivory-cream to pale amber waxy rhizome butter in carrier',
    documentedColorRange: ['#E6DBC2', '#CFC09E'],
    visualColorHex: '#DACDB0',
    opacity: 0.46,
    visualIntensity: 0.52,
    viscosityClass: 'medium-oil',
    colorSource: 'Diluted Iris pallida rhizome butter (~15% irone) reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#52495E',
    labelToneHex: '#B6A8C9',
  }),
  cinnamon: makeMeta({
    materialId: 'cinnamon',
    displayName: 'Ceylon Cinnamon Bark',
    tier: 'heart',
    documentedLiquidColor: 'Warm golden-brown to reddish-amber bark distillate',
    documentedColorRange: ['#B66E36', '#8E4B22'],
    visualColorHex: '#A25D2C',
    opacity: 0.56,
    visualIntensity: 0.92,
    viscosityClass: 'medium-oil',
    colorSource: 'Cinnamomum verum inner bark oil darkening reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#5A331C',
    labelToneHex: '#C87848',
  }),
  saffron: makeMeta({
    materialId: 'saffron',
    displayName: 'Kashmir Saffron',
    tier: 'heart',
    documentedLiquidColor: 'Rich crimson-saffron to deep orange-gold stigma tincture',
    documentedColorRange: ['#C85524', '#9E3714'],
    visualColorHex: '#B8461B',
    opacity: 0.72,
    visualIntensity: 1.24,
    viscosityClass: 'light-oil',
    colorSource: 'Crocus sativus crocin-pigmented tincture / accord reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#632815',
    labelToneHex: '#D87A3F',
  }),
  'black-tea': makeMeta({
    materialId: 'black-tea',
    displayName: 'Smoked Black Tea',
    tier: 'heart',
    documentedLiquidColor: 'Clear amber-brown to dark russet smoked leaf extract',
    documentedColorRange: ['#8D5937', '#673B22'],
    visualColorHex: '#7A4A2C',
    opacity: 0.64,
    visualIntensity: 1.04,
    viscosityClass: 'light-oil',
    colorSource: 'Camellia sinensis roasted/smoked leaf tincture approximation',
    colorConfidence: 'estimated',
    bottleTintHex: '#4B2E1E',
    labelToneHex: '#A77454',
  }),
  geranium: makeMeta({
    materialId: 'geranium',
    displayName: 'Bourbon Geranium',
    tier: 'heart',
    documentedLiquidColor: 'Light amber-green to olive-gold leaf distillate',
    documentedColorRange: ['#BFB86E', '#949852'],
    visualColorHex: '#ABA860',
    opacity: 0.34,
    visualIntensity: 0.56,
    viscosityClass: 'light-oil',
    colorSource: 'Pelargonium graveolens Bourbon essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#4F4B36',
    labelToneHex: '#C57B84',
  }),

  // BASE NOTES
  sandalwood: makeMeta({
    materialId: 'sandalwood',
    displayName: 'Mysore Sandalwood',
    tier: 'base',
    documentedLiquidColor: 'Pale gold to warm straw-yellow viscous heartwood oil',
    documentedColorRange: ['#DFCA86', '#C6A95D'],
    visualColorHex: '#D2BA72',
    opacity: 0.42,
    visualIntensity: 0.58,
    viscosityClass: 'medium-oil',
    colorSource: 'Santalum album / spicatum steam-distilled heartwood oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#594A2B',
    labelToneHex: '#D2BA72',
  }),
  vanilla: makeMeta({
    materialId: 'vanilla',
    displayName: 'Madagascar Vanilla Absolute',
    tier: 'base',
    documentedLiquidColor: 'Dark reddish-brown to deep walnut resinous bean absolute',
    documentedColorRange: ['#7B4624', '#562D16'],
    visualColorHex: '#69391D',
    opacity: 0.80,
    visualIntensity: 1.28,
    viscosityClass: 'viscous-resin',
    colorSource: 'Vanilla planifolia cured pod solvent absolute reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#442615',
    labelToneHex: '#C99652',
  }),
  amber: makeMeta({
    materialId: 'amber',
    displayName: 'Labdanum Amber Resin',
    tier: 'base',
    documentedLiquidColor: 'Deep molten amber-mahogany viscous rockrose resinoid',
    documentedColorRange: ['#9E551C', '#74370F'],
    visualColorHex: '#8C4615',
    opacity: 0.84,
    visualIntensity: 1.32,
    viscosityClass: 'viscous-resin',
    colorSource: 'Cistus ladanifer resinoid / amber accord reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#522A11',
    labelToneHex: '#C47D34',
  }),
  musk: makeMeta({
    materialId: 'musk',
    displayName: 'Silk White Musk',
    tier: 'base',
    documentedLiquidColor: 'Colorless to very faint clear pearl macrocyclic musk dilution',
    documentedColorRange: ['#F5F3EE', '#EAE6DC'],
    visualColorHex: '#EFECE4',
    opacity: 0.10,
    visualIntensity: 0.14,
    viscosityClass: 'light-oil',
    colorSource: 'Synthetic macrocyclic white musk carrier solution reference',
    colorConfidence: 'estimated',
    bottleTintHex: '#4A4640',
    labelToneHex: '#D5CEC2',
  }),
  cedarwood: makeMeta({
    materialId: 'cedarwood',
    displayName: 'Atlas Cedarwood',
    tier: 'base',
    documentedLiquidColor: 'Golden-yellow to light amber-orange heartwood oil',
    documentedColorRange: ['#D2A658', '#B3833A'],
    visualColorHex: '#C29548',
    opacity: 0.44,
    visualIntensity: 0.66,
    viscosityClass: 'medium-oil',
    colorSource: 'Cedrus atlantica steam-distilled wood essential oil reference',
    colorConfidence: 'documented-typical',
    bottleTintHex: '#543F22',
    labelToneHex: '#C29548',
  }),
  patchouli: makeMeta({
    materialId: 'patchouli',
    displayName: 'Aged Indonesian Patchouli',
    tier: 'base',
    documentedLiquidColor: 'Dark reddish-brown to deep umber cellar-aged leaf oil',
    documentedColorRange: ['#744A2B', '#4F301A'],
    visualColorHex: '#633E22',
    opacity: 0.78,
    visualIntensity: 1.26,
    viscosityClass: 'viscous-resin',
    colorSource: 'Pogostemon cablin aged Sumatran essential oil reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#422918',
    labelToneHex: '#9A7254',
  }),
  vetiver: makeMeta({
    materialId: 'vetiver',
    displayName: 'Haitian Vetiver',
    tier: 'base',
    documentedLiquidColor: 'Olive-amber to golden-brown viscous rootlet oil',
    documentedColorRange: ['#9B8842', '#756328'],
    visualColorHex: '#887535',
    opacity: 0.62,
    visualIntensity: 0.94,
    viscosityClass: 'viscous-resin',
    colorSource: 'Chrysopogon zizanioides steam-distilled root oil reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#474224',
    labelToneHex: '#9AA378',
  }),
  'oud-smoke': makeMeta({
    materialId: 'oud-smoke',
    displayName: 'Dark Agarwood Smoke',
    tier: 'base',
    documentedLiquidColor: 'Deep dark espresso-amber resinous agarwood-birch oil',
    documentedColorRange: ['#563423', '#361E14'],
    visualColorHex: '#47291B',
    opacity: 0.88,
    visualIntensity: 1.42,
    viscosityClass: 'viscous-resin',
    colorSource: 'Aquilaria resinous wood & smoked tar accord reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#331E15',
    labelToneHex: '#9B7566',
  }),
  'tonka-bean': makeMeta({
    materialId: 'tonka-bean',
    displayName: 'Venezuelan Tonka Bean',
    tier: 'base',
    documentedLiquidColor: 'Warm golden-caramel to amber-brown cured bean tincture',
    documentedColorRange: ['#B87C3D', '#8F5926'],
    visualColorHex: '#A36B32',
    opacity: 0.66,
    visualIntensity: 1.02,
    viscosityClass: 'medium-oil',
    colorSource: 'Dipteryx odorata absolute / diluted tincture reference',
    colorConfidence: 'variable-natural',
    bottleTintHex: '#52361B',
    labelToneHex: '#B6834D',
  }),
};

function srgbChannelToLinear(c: number): number {
  const n = clamp(c / 255, 0, 1);
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgbByte(lin: number): number {
  const n = clamp(lin, 0, 1);
  const srgb = n <= 0.0031308 ? 12.92 * n : 1.055 * Math.pow(n, 1 / 2.4) - 0.055;
  return clamp(Math.round(srgb * 255), 0, 255);
}

function hexToLinearRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return { r: 0.65, g: 0.45, b: 0.16 };
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return { r: 0.65, g: 0.45, b: 0.16 };
  }
  return {
    r: Math.max(0.015, srgbChannelToLinear((num >> 16) & 255)),
    g: Math.max(0.015, srgbChannelToLinear((num >> 8) & 255)),
    b: Math.max(0.015, srgbChannelToLinear(num & 255)),
  };
}

function linearRgbToHex(r: number, g: number, b: number): string {
  const toHex = (lin: number) =>
    linearChannelToSrgbByte(lin).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getMaterialVisualMetadata(noteId: string): MaterialVisualMetadata | undefined {
  return MATERIAL_VISUAL_METADATA[noteId];
}

/**
 * Deterministic subtractive liquid mixing model inspired by Beer–Lambert attenuation.
 *
 * Each material i with drop fraction f_i has:
 *   - linear-RGB transmittance color c_i
 *   - chromophore extinction coefficient k_i = visualIntensity * (0.35 + 0.65 * opacity)
 *   - spectral absorbance vector A_i = -ln(c_i) * k_i
 *
 * Mixture absorbance: A_mix = sum(f_i * A_i)
 * Optical depth factor: d = 0.58 + 0.64 * min(1, totalDrops / 20)
 * Transmitted vessel color: T_mix = exp(-d * A_mix)
 *
 * Consequently, small additions of strongly chromophoric resins (amber, saffron,
 * oud, vanilla, patchouli) shift pale/transparent carrier bases (white musk, sea salt,
 * juniper) far more realistically than an unweighted RGB mean.
 */
export function calculateVesselLiquidAppearance(
  entries: NormalizedNoteEntry[]
): VesselLiquidAppearance {
  const totalDrops = entries.reduce((sum, e) => sum + e.drops, 0);

  if (totalDrops <= 0 || entries.length === 0) {
    return {
      liquidColorHex: '#D4AF6E',
      deepColorHex: '#B6904E',
      meniscusColorHex: '#EDE0C2',
      effectiveOpacity: 0,
      fillPercent: 0,
      opticalDensity: 0,
      viscosityProfile: 'water-thin',
      materialCount: 0,
      documentedCount: 0,
      variableCount: 0,
      estimatedCount: 0,
    };
  }

  let absR = 0;
  let absG = 0;
  let absB = 0;
  let weightedOpacity = 0;
  let weightedIntensity = 0;
  let viscosityScore = 0;

  let documentedCount = 0;
  let variableCount = 0;
  let estimatedCount = 0;

  const viscWeight: Record<MaterialViscosityClass, number> = {
    'water-thin': 1,
    'light-oil': 2,
    'medium-oil': 3,
    'viscous-resin': 4,
  };

  for (const { note, drops } of entries) {
    const share = drops / totalDrops;
    const meta = note.visualMeta ?? MATERIAL_VISUAL_METADATA[note.id];
    const colorHex = meta?.visualColorHex ?? note.colorHex;
    const opacity = meta?.opacity ?? 0.45;
    const visualIntensity = meta?.visualIntensity ?? 0.65;
    const visc = meta?.viscosityClass ?? 'light-oil';
    const conf = meta?.colorConfidence ?? 'estimated';

    if (conf === 'documented-typical') documentedCount += 1;
    else if (conf === 'variable-natural') variableCount += 1;
    else estimatedCount += 1;

    const lin = hexToLinearRgb(colorHex);
    const k = visualIntensity * (0.35 + 0.65 * opacity);

    absR += share * (-Math.log(lin.r) * k);
    absG += share * (-Math.log(lin.g) * k);
    absB += share * (-Math.log(lin.b) * k);

    weightedOpacity += share * opacity;
    weightedIntensity += share * k;
    viscosityScore += share * viscWeight[visc];
  }

  const dropDepthFactor = 0.58 + 0.64 * Math.min(1, totalDrops / 20);

  // Mid-vessel transmittance
  const transR = Math.exp(-dropDepthFactor * absR);
  const transG = Math.exp(-dropDepthFactor * absG);
  const transB = Math.exp(-dropDepthFactor * absB);

  // Lower-vessel deeper path (subtle natural beer-lambert depth without murky gradients)
  const deepDepthFactor = dropDepthFactor * 1.42;
  const deepR = Math.exp(-deepDepthFactor * absR);
  const deepG = Math.exp(-deepDepthFactor * absG);
  const deepB = Math.exp(-deepDepthFactor * absB);

  // Meniscus rim highlight (shallower optical path + soft daylight scatter)
  const rimDepthFactor = dropDepthFactor * 0.48;
  const rimR = clamp(Math.exp(-rimDepthFactor * absR) * 0.85 + 0.15, 0, 1);
  const rimG = clamp(Math.exp(-rimDepthFactor * absG) * 0.85 + 0.15, 0, 1);
  const rimB = clamp(Math.exp(-rimDepthFactor * absB) * 0.85 + 0.15, 0, 1);

  // Translucent vessel liquid opacity (never opaque by default)
  const rawOpacity =
    1 - Math.exp(-0.92 * weightedOpacity * (0.48 + 0.52 * Math.min(1, totalDrops / 16)));
  const effectiveOpacity = Number(clamp(rawOpacity, 0.22, 0.86).toFixed(2));

  const fillPercent = Number(
    Math.min(92, Math.max(16, (totalDrops / 24) * 84 + 10)).toFixed(1)
  );

  const viscosityProfile: MaterialViscosityClass =
    viscosityScore >= 3.3
      ? 'viscous-resin'
      : viscosityScore >= 2.4
      ? 'medium-oil'
      : viscosityScore >= 1.5
      ? 'light-oil'
      : 'water-thin';

  return {
    liquidColorHex: linearRgbToHex(transR, transG, transB),
    deepColorHex: linearRgbToHex(deepR, deepG, deepB),
    meniscusColorHex: linearRgbToHex(rimR, rimG, rimB),
    effectiveOpacity,
    fillPercent,
    opticalDensity: Number((dropDepthFactor * weightedIntensity).toFixed(2)),
    viscosityProfile,
    materialCount: entries.length,
    documentedCount,
    variableCount,
    estimatedCount,
  };
}
