import type {
  AtelierMood,
  DataCompletenessStatus,
  IntensityPreference,
  NoteLayer,
  OlfactoryFamily,
  TemperaturePreference,
} from '../types/fragrance';

export type Locale = 'en' | 'fa';
export type Direction = 'ltr' | 'rtl';

export interface LocalizedNoteCopy {
  name: string;
  description: string;
  origin: string;
  accords: string[];
}

export interface LocalizedPresetCopy {
  name: string;
  subtitle: string;
}

export interface TranslationResource {
  brand: {
    name: string;
    shortName: string;
    subtitle: string;
    emblemAlt: string;
    logoAlt: string;
  };
  nav: {
    discovery: string;
    discoveryShort: string;
    lab: string;
    reveal: string;
    revealShort: string;
    savedLibrary: string;
    savedShort: string;
    primaryAria: string;
    mobileAria: string;
  };
  controls: {
    languageLabel: string;
    switchToEn: string;
    switchToFa: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
  footer: {
    studioTagline: string;
    attributionPrefix: string;
    attributionLicense: string;
    disclaimer: string;
    catalogButton: string;
  };
  discovery: {
    eyebrow: string;
    headline: string;
    lead: string;
    enterLab: string;
    buildProfile: string;
    statNotesLabel: string;
    statTiersValue: string;
    statTiersLabel: string;
    statPerfumesLabel: string;
    heroImgAlt: string;
    heroCaption: string;
    heroFallbackTitle: string;
    presetsEyebrow: string;
    presetsTitle: string;
    presetsSubtitle: string;
    presetNotesDrops: string;
    stageEyebrow: string;
    stageTitle: string;
    resetPreferences: string;
    step1Title: string;
    step1SelectedCount: string;
    step2Title: string;
    step3Title: string;
    step4Title: string;
    tempOptions: Record<TemperaturePreference, string>;
    intensityOptions: Record<IntensityPreference, string>;
    moodOptions: Record<AtelierMood, { label: string; subtitle: string }>;
    botanicalImgAlt: string;
    profileCardEyebrow: string;
    recommendedPalette: string;
    applyProfileCta: string;
    startEmptyCta: string;
  };
  lab: {
    eyebrow: string;
    profilePrefix: string;
    title: string;
    presetPlaceholder: string;
    presetLabel: string;
    undo: string;
    reset: string;
    audioOn: string;
    audioOff: string;
    audioMuteAria: string;
    audioEnableAria: string;
    mobileReveal: string;
    dropSingular: string;
    dropPlural: string;
    noteSingular: string;
    notePlural: string;
    searchPlaceholder: string;
    searchAria: string;
    allFamilies: string;
    familyFilterAria: string;
    layerFilterAria: string;
    layers: {
      allShort: string;
      allFull: string;
      topShort: string;
      topFull: string;
      heartShort: string;
      heartFull: string;
      baseShort: string;
      baseFull: string;
    };
    emptyFilter: string;
    clearFilters: string;
    profileMatch: string;
    removeDropAria: string;
    addDropAria: string;
    addThreeDropsAria: string;
    addThreeDropsLabel: string;
    dropsUnitLabel: string;
    vesselVolumeLabel: string;
    vesselEmptyAria: string;
    vesselFilledAria: string;
    familyLabel: string;
    unassignedFamily: string;
    essenceHueLabel: string;
    accordsLabel: string;
    normalizedTitle: string;
    totalPercent: string;
    zeroPercent: string;
    normalizedDisclaimer: string;
    emptyVesselPrompt: string;
    removeNoteAria: string;
    diagnosticsTitle: string;
    statusBalanced: string;
    statusAdvisory: string;
    statusImbalanced: string;
    facets: {
      warmth: string;
      freshness: string;
      sweetness: string;
      dryness: string;
      smokiness: string;
      floralcy: string;
    };
    browseLayerNotes: string;
    revealCta: string;
  };
  reveal: {
    distillingEyebrow: string;
    distillingTitle: string;
    distillingSubtitle: string;
    alambicAlt: string;
    stageEyebrow: string;
    untitledComposition: string;
    returnToLab: string;
    personalizeTitle: string;
    fragranceNameLabel: string;
    fragranceNamePlaceholder: string;
    alchemistNameLabel: string;
    alchemistNamePlaceholder: string;
    defaultAlchemist: string;
    familySuffix: string;
    critiqueTitle: string;
    critiqueAiSubtitle: string;
    critiqueDeterministicSubtitle: string;
    refreshNote: string;
    refining: string;
    critiqueUnavailableNotice: string;
    critiqueNetworkNotice: string;
    matchesTitle: string;
    matchesSubtitleIndexed: string;
    matchesSubtitleFallback: string;
    matchErrorFallback: string;
    retryMatch: string;
    primaryAlignments: string;
    exploratoryResemblances: string;
    showFewer: string;
    showAllExploratory: string;
    matchTierStrong: string;
    matchTierModerate: string;
    matchTierExploratory: string;
    confidenceLabel: string;
    similarityEst: string;
    sharedElements: string;
    accordsFallback: string;
    tierAlignedSuffix: string;
    divergence: string;
    sourceLabel: string;
    viewReferenceRecord: string;
    completeness: Record<DataCompletenessStatus, string>;
    passportTitle: string;
    passportCrestAlt: string;
    composedBy: string;
    notesSectionSuffix: string;
    noneLabel: string;
    closestMatchLabel: string;
    passportDisclaimer: string;
    downloadPng: string;
    pngExported: string;
    copySummary: string;
    summaryCopied: string;
    saveToLibrary: string;
    savedToLibrary: string;
    lowMatchNotice: string;
    yearUnrecorded: string;
  };
  library: {
    eyebrow: string;
    title: string;
    closeAria: string;
    emptyTitle: string;
    emptyDescription: string;
    loadInLab: string;
    viewPassport: string;
    deleteAria: string;
    bespoke: string;
  };
  admin: {
    eyebrow: string;
    title: string;
    closeAria: string;
    loadError: string;
    statPerfumes: string;
    statHouses: string;
    statNotes: string;
    statCompletePyramids: string;
    statFlatOnly: string;
    sourcesTitle: string;
    recordsCount: string;
    attributionLine: string;
    commercialNote: string;
    integrityTitle: string;
    integrityLine1: string;
    integrityLine2: string;
    lastUpdated: string;
    searchPlaceholder: string;
    filterCompletenessAria: string;
    allCompleteness: string;
    completeOpt: string;
    partialOpt: string;
    minimalOpt: string;
    hideImport: string;
    showImport: string;
    importBanner: string;
    importSubBanner: string;
    importTextareaAria: string;
    importInvalidJson: string;
    importFailed: string;
    importSuccess: string;
    importSubmit: string;
    importing: string;
    colPerfumeHouse: string;
    colFamily: string;
    colNotes: string;
    colCompleteness: string;
    colSource: string;
    loadingRows: string;
    emptyRows: string;
    showingRange: string;
    prevPageAria: string;
    nextPageAria: string;
  };
  domain: {
    layers: Record<NoteLayer, string>;
    families: Record<OlfactoryFamily, string>;
    moodTags: Record<string, string>;
    seasonTags: Record<string, string>;
    accords: Record<string, string>;
    notes: Record<string, LocalizedNoteCopy>;
    presets: Record<string, LocalizedPresetCopy>;
  };
  passportExport: {
    header: string;
    pyramidCaption: string;
    topLabel: string;
    heartLabel: string;
    baseLabel: string;
    noneIncluded: string;
    similarityEstimateHeader: string;
    sharedNotesPrefix: string;
    sharedAccordsPrefix: string;
    archiveNoteHeader: string;
    footerDisclaimer: string;
    summaryTitle: string;
    summaryAlchemist: string;
    summaryFormula: string;
    summaryCreated: string;
    summaryFamily: string;
    summaryPyramid: string;
    summaryClosest: string;
    summaryNote: string;
  };
}
