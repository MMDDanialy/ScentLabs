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

export interface ReferencePerfume {
  id: string;
  name: string;
  house: string;
  releaseYear: number;
  family: OlfactoryFamily;
  accords: string[];
  keyNoteIds: string[];
  topNoteNames: string[];
  heartNoteNames: string[];
  baseNoteNames: string[];
  mood: string[];
  seasons: string[];
  description: string;
  facets: FacetProfile;
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

export interface MatchResult {
  perfume: ReferencePerfume;
  similarityScore: number;
  sharedNotes: string[];
  sharedAccords: string[];
  keyDifferences: string[];
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
  moodTags: string[];
  seasonTags: string[];
  editorialCritique: string;
  critiqueSource: 'ai' | 'deterministic';
}

export type AppStage = 'discovery' | 'lab' | 'reveal';
