export type NoteLayer = 'top' | 'heart' | 'base';

export type OlfactoryFamily =
  | 'Citrus'
  | 'Floral'
  | 'Woody'
  | 'Amber & Oriental'
  | 'Spicy'
  | 'Smoky & Leather'
  | 'Aromatic & Herbal'
  | 'Musk & Skin';

export interface FacetProfile {
  warmth: number;
  freshness: number;
  sweetness: number;
  dryness: number;
  smokiness: number;
  floralcy: number;
}

export interface FragranceNote {
  id: string;
  name: string;
  layer: NoteLayer;
  family: OlfactoryFamily;
  accords: string[];
  origin: string;
  description: string;
  volatility: number;
  intensity: number;
  colorHex: string;
  facets: FacetProfile;
}

export type DataCompletenessStatus = 'complete' | 'partial' | 'minimal';

export interface PerfumeProvenance {
  provider: string;
  license: string;
  sourceUrl: string;
  sourceId: string;
  verifiedAt: string;
}

export interface ReferencePerfume {
  id: string;
  name: string;
  house: string;
  houseId?: string;
  releaseYear: number | null;
  concentration: string | null;
  perfumers: string[];
  family: string;
  secondaryFamily?: string;
  accords: string[];
  keyNoteIds?: string[];
  topNoteNames: string[];
  heartNoteNames: string[];
  baseNoteNames: string[];
  allNoteNames: string[];
  canonicalNoteIds: string[];
  topCanonicalIds: string[];
  heartCanonicalIds: string[];
  baseCanonicalIds: string[];
  mood: string[];
  seasons: string[];
  description: string;
  completeness: DataCompletenessStatus;
  pyramidComplete: boolean;
  popularityRank?: number | null;
  provenance: PerfumeProvenance;
  facets?: FacetProfile;
}

export type BlendSelection = Record<string, number>;

export interface NormalizedNoteEntry {
  note: FragranceNote;
  drops: number;
  percentage: number;
}

export interface PyramidBreakdown {
  top: number;
  heart: number;
  base: number;
}

export type BalanceSeverity = 'balanced' | 'advisory' | 'imbalanced';

export interface BalanceDiagnostic {
  id: string;
  title: string;
  detail: string;
  suggestion: string;
  targetLayer?: NoteLayer;
  severity: BalanceSeverity;
}

export interface AccordWeight {
  accord: string;
  weight: number;
}

export interface BalanceReport {
  totalDrops: number;
  noteCount: number;
  pyramid: PyramidBreakdown;
  dominantAccords: AccordWeight[];
  dominantFamily: OlfactoryFamily | null;
  facets: FacetProfile;
  overallStatus: BalanceSeverity;
  summary: string;
  diagnostics: BalanceDiagnostic[];
  blendedColorHex: string;
}

export type MatchStrengthTier = 'strong' | 'moderate' | 'exploratory';

export interface MatchedNoteDetail {
  noteName: string;
  canonicalId: string;
  userLayer: NoteLayer;
  refLayer: NoteLayer | 'unspecified';
  tierAligned: boolean;
  matchType: 'exact' | 'related';
  userShare: number;
}

export interface MatchScoreBreakdown {
  userNoteCoverage: number;
  refPrecision: number;
  tierNoteAlignment: number;
  pyramidDistribution: number;
  familyAccord: number;
  facetProximity: number;
}

export interface MatchResult {
  perfume: ReferencePerfume;
  similarityScore: number;
  confidenceScore: number;
  matchTier: MatchStrengthTier;
  tierAlignmentScore: number;
  sharedNotes: string[];
  sharedCanonicalIds?: string[];
  userOnlyNoteNames?: string[];
  refOnlyNoteNames?: string[];
  matchedDetails: MatchedNoteDetail[];
  sharedAccords: string[];
  keyDifferences: string[];
  explanation: string;
  scoreBreakdown?: MatchScoreBreakdown;
}

export interface MatchApiResponse {
  matches: MatchResult[];
  strongMatches: MatchResult[];
  exploratoryMatches: MatchResult[];
  lowMatchNotice: string | null;
  searchedCount: number;
  candidateCount: number;
  algorithmVersion?: string;
  attribution: {
    name: string;
    url: string;
    license: string;
  };
}

export interface CatalogSourceSummary {
  provider: string;
  license: string;
  url: string;
  count: number;
}

export interface CatalogStats {
  totalPerfumes: number;
  totalHouses: number;
  totalMaterials: number;
  totalNormalizedNotesInCatalog: number;
  completePyramids: number;
  partialPyramids: number;
  flatNotesOnly: number;
  missingYears: number;
  duplicateCount: number;
  failedImports: number;
  lastUpdatedAt: string;
  sources: CatalogSourceSummary[];
}

export interface AdminCatalogPage {
  stats: CatalogStats;
  items: ReferencePerfume[];
  totalFiltered: number;
  page: number;
  limit: number;
}

export interface AdminImportRecordInput {
  id?: string;
  name: string;
  house: string;
  year?: number | null;
  concentration?: string | null;
  perfumers?: string[];
  family?: string;
  secondary_family?: string;
  character?: string[];
  seasons?: string[];
  times_of_day?: string[];
  top_notes?: string[];
  heart_notes?: string[];
  base_notes?: string[];
  notes?: string[];
  description?: string;
  url?: string;
  provider?: string;
  license?: string;
}

export interface AdminImportResult {
  added: number;
  duplicates: number;
  failed: number;
  errors: string[];
  stats: CatalogStats;
}

export type TemperaturePreference = 'fresh' | 'balanced' | 'warm';
export type IntensityPreference = 'sheer' | 'moderate' | 'opulent';
export type AtelierMood =
  | 'Daylight Atelier'
  | 'Evening Noir'
  | 'Botanical Solitude'
  | 'Velvet Ceremony';

export interface ScentProfile {
  preferredFamilies: OlfactoryFamily[];
  temperaturePreference: TemperaturePreference;
  intensityPreference: IntensityPreference;
  mood: AtelierMood;
  recommendedNoteIds: string[];
  label: string;
  summary: string;
}

export interface AtelierPreset {
  id: string;
  name: string;
  subtitle: string;
  selection: BlendSelection;
}

export interface PassportData {
  id: string;
  formulaCode: string;
  fragranceName: string;
  alchemistName: string;
  createdAt: string;
  totalDrops: number;
  entries: NormalizedNoteEntry[];
  balance: BalanceReport;
  topMatches: MatchResult[];
  matchSummary?: {
    searchedCount: number;
    candidateCount: number;
    lowMatchNotice: string | null;
    attributionName: string;
    attributionUrl: string;
    attributionLicense: string;
  };
  moodTags: string[];
  seasonTags: string[];
  editorialCritique: string;
  critiqueSource: 'ai' | 'deterministic';
  algorithmVersion?: string;
  schemaVersion?: number;
}

export type AppStage = 'discovery' | 'lab' | 'reveal';
