import fs from 'fs';
import path from 'path';
import type {
  AdminCatalogPage,
  AdminImportRecordInput,
  AdminImportResult,
  BlendSelection,
  CatalogStats,
  DataCompletenessStatus,
  FragranceNote,
  MatchApiResponse,
  ReferencePerfume,
} from '../types/fragrance';
import {
  normalizeNoteKey,
  NoteNormalizer,
  parseCsvRows,
} from '../engine/noteNormalization';
import {
  buildCatalogIndex,
  type CatalogIndex,
  matchCompositionAgainstCatalog,
} from '../engine/similarityEngine';

interface RawScentoPerfume {
  id?: string;
  name?: string;
  house_id?: string;
  house?: string;
  year?: number | null;
  perfumers?: string[];
  concentration?: string | null;
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
  popularity_rank?: number | null;
  url?: string;
  provider?: string;
  license?: string;
}

const DEFAULT_ATTRIBUTION = {
  provider: 'Scento Perfume Database',
  license: 'CC BY 4.0',
  url: 'https://www.scento.com/perfume-database',
};

function dedupKeyFor(
  house: string,
  name: string,
  concentration: string | null,
  year: number | null
): string {
  return [
    normalizeNoteKey(house),
    normalizeNoteKey(name),
    normalizeNoteKey(concentration || ''),
    year === null || year === undefined ? 'unknown' : String(year),
  ].join('::');
}

function classifyCompleteness(
  top: string[],
  heart: string[],
  base: string[],
  all: string[]
): { completeness: DataCompletenessStatus; pyramidComplete: boolean } {
  const hasTop = top.length > 0;
  const hasHeart = heart.length > 0;
  const hasBase = base.length > 0;
  const tierCount = Number(hasTop) + Number(hasHeart) + Number(hasBase);

  if (tierCount === 3) {
    return { completeness: 'complete', pyramidComplete: true };
  }
  if (tierCount >= 1) {
    return { completeness: 'partial', pyramidComplete: false };
  }
  return { completeness: all.length > 0 ? 'minimal' : 'minimal', pyramidComplete: false };
}

export class CatalogRepository {
  private readonly dataDir: string;
  private readonly customFilePath: string;
  private normalizer: NoteNormalizer;
  private perfumes: ReferencePerfume[] = [];
  private dedupMap = new Map<string, number>();
  private index: CatalogIndex;
  private houseSet = new Set<string>();
  private normalizedCatalogNotes = new Set<string>();
  private duplicateCount = 0;
  private failedImports = 0;
  private lastUpdatedAt = new Date().toISOString();

  constructor(dataDir = path.resolve(process.cwd(), 'data')) {
    this.dataDir = dataDir;
    this.customFilePath = path.join(this.dataDir, 'custom_perfumes.json');
    this.normalizer = new NoteNormalizer([]);
    this.index = buildCatalogIndex([], this.normalizer);
  }

  public loadFromDisk(): void {
    const scentoDir = path.join(this.dataDir, 'scento');
    const materialsPath = path.join(scentoDir, 'materials.csv');
    const housesPath = path.join(scentoDir, 'houses.csv');
    const perfumesPath = path.join(scentoDir, 'perfumes.jsonl');
    const datapackagePath = path.join(scentoDir, 'datapackage.json');

    this.perfumes = [];
    this.dedupMap.clear();
    this.houseSet.clear();
    this.normalizedCatalogNotes.clear();
    this.duplicateCount = 0;
    this.failedImports = 0;

    if (fs.existsSync(materialsPath)) {
      const csvText = fs.readFileSync(materialsPath, 'utf8');
      this.normalizer = NoteNormalizer.fromMaterialsCsv(csvText);
    } else {
      this.normalizer = new NoteNormalizer([]);
    }

    if (fs.existsSync(housesPath)) {
      const rows = parseCsvRows(fs.readFileSync(housesPath, 'utf8'));
      for (let i = 1; i < rows.length; i++) {
        const name = (rows[i][1] ?? '').trim();
        if (name) this.houseSet.add(normalizeNoteKey(name));
      }
    }

    if (fs.existsSync(datapackagePath)) {
      try {
        const dp = JSON.parse(fs.readFileSync(datapackagePath, 'utf8')) as { created?: string };
        if (dp.created) {
          this.lastUpdatedAt = dp.created;
        }
      } catch {
        // Ignore datapackage parse issues
      }
    }

    if (fs.existsSync(perfumesPath)) {
      const lines = fs.readFileSync(perfumesPath, 'utf8').split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        try {
          const raw = JSON.parse(line) as RawScentoPerfume;
          this.ingestRawRecord(raw, DEFAULT_ATTRIBUTION.provider, DEFAULT_ATTRIBUTION.license, this.lastUpdatedAt);
        } catch {
          this.failedImports += 1;
        }
      }
    }

    if (fs.existsSync(this.customFilePath)) {
      try {
        const customRaw = JSON.parse(
          fs.readFileSync(this.customFilePath, 'utf8')
        ) as RawScentoPerfume[];
        if (Array.isArray(customRaw)) {
          for (const rec of customRaw) {
            this.ingestRawRecord(
              rec,
              rec.provider || 'Atelier Custom Import',
              rec.license || 'User Verified Entry',
              new Date().toISOString()
            );
          }
        }
      } catch {
        this.failedImports += 1;
      }
    }

    this.rebuildIndex();
  }

  private normalizeRecord(
    raw: RawScentoPerfume,
    provider: string,
    license: string,
    verifiedAt: string
  ): ReferencePerfume | null {
    const name = (raw.name ?? '').trim();
    const house = (raw.house ?? '').trim();
    if (!name || !house) return null;

    const topNotes = Array.isArray(raw.top_notes)
      ? raw.top_notes.map((n) => n.trim()).filter(Boolean)
      : [];
    const heartNotes = Array.isArray(raw.heart_notes)
      ? raw.heart_notes.map((n) => n.trim()).filter(Boolean)
      : [];
    const baseNotes = Array.isArray(raw.base_notes)
      ? raw.base_notes.map((n) => n.trim()).filter(Boolean)
      : [];
    const flatNotes = Array.isArray(raw.notes)
      ? raw.notes.map((n) => n.trim()).filter(Boolean)
      : [];

    const allNoteNames = Array.from(
      new Set([...topNotes, ...heartNotes, ...baseNotes, ...flatNotes])
    );
    if (allNoteNames.length === 0) return null;

    const resolveList = (list: string[]) =>
      Array.from(new Set(list.map((n) => this.normalizer.resolve(n).canonicalId)));

    const topCanonicalIds = resolveList(topNotes);
    const heartCanonicalIds = resolveList(heartNotes);
    const baseCanonicalIds = resolveList(baseNotes);
    const canonicalNoteIds = resolveList(allNoteNames);

    const { completeness, pyramidComplete } = classifyCompleteness(
      topNotes,
      heartNotes,
      baseNotes,
      allNoteNames
    );

    const concentration =
      typeof raw.concentration === 'string' && raw.concentration.trim()
        ? raw.concentration.trim()
        : null;
    const releaseYear =
      typeof raw.year === 'number' &&
      Number.isFinite(raw.year) &&
      raw.year >= 1700 &&
      raw.year <= 2030
        ? Math.round(raw.year)
        : null;

    const id =
      (raw.id ?? '').trim() ||
      `${normalizeNoteKey(house).replace(/\s+/g, '-')}-${normalizeNoteKey(name).replace(/\s+/g, '-')}`;

    const sourceUrl =
      (raw.url ?? '').trim() || DEFAULT_ATTRIBUTION.url;

    const accords = Array.isArray(raw.character)
      ? raw.character.map((c) => c.trim()).filter(Boolean)
      : [];

    return {
      id,
      name,
      house,
      houseId: raw.house_id,
      releaseYear,
      concentration,
      perfumers: Array.isArray(raw.perfumers)
        ? raw.perfumers.map((p) => p.trim()).filter(Boolean)
        : [],
      family: (raw.family ?? '').trim() || 'Unclassified',
      secondaryFamily: (raw.secondary_family ?? '').trim() || undefined,
      accords,
      topNoteNames: topNotes,
      heartNoteNames: heartNotes,
      baseNoteNames: baseNotes,
      allNoteNames,
      canonicalNoteIds,
      topCanonicalIds,
      heartCanonicalIds,
      baseCanonicalIds,
      mood: accords.slice(0, 3),
      seasons: Array.isArray(raw.seasons)
        ? raw.seasons.map((s) => s.trim()).filter(Boolean)
        : [],
      description:
        (raw.description ?? '').trim() ||
        `${name} by ${house}: ${allNoteNames.slice(0, 6).join(', ')}.`,
      completeness,
      pyramidComplete,
      popularityRank:
        typeof raw.popularity_rank === 'number' ? raw.popularity_rank : null,
      provenance: {
        provider,
        license,
        sourceUrl,
        sourceId: id,
        verifiedAt,
      },
    };
  }

  private ingestRawRecord(
    raw: RawScentoPerfume,
    provider: string,
    license: string,
    verifiedAt: string
  ): 'added' | 'duplicate' | 'failed' {
    const normalized = this.normalizeRecord(raw, provider, license, verifiedAt);
    if (!normalized) {
      this.failedImports += 1;
      return 'failed';
    }

    const key = dedupKeyFor(
      normalized.house,
      normalized.name,
      normalized.concentration,
      normalized.releaseYear
    );
    if (this.dedupMap.has(key)) {
      this.duplicateCount += 1;
      return 'duplicate';
    }

    const idx = this.perfumes.length;
    this.perfumes.push(normalized);
    this.dedupMap.set(key, idx);
    this.houseSet.add(normalizeNoteKey(normalized.house));
    for (const cid of normalized.canonicalNoteIds) {
      this.normalizedCatalogNotes.add(cid);
    }
    return 'added';
  }

  private rebuildIndex(): void {
    this.index = buildCatalogIndex(this.perfumes, this.normalizer);
  }

  public match(
    selection: BlendSelection,
    notes: FragranceNote[],
    options: { limit?: number } = {}
  ): MatchApiResponse {
    return matchCompositionAgainstCatalog(
      selection,
      notes,
      this.index,
      this.normalizer,
      options
    );
  }

  public upsertPerfumes(
    records: AdminImportRecordInput[],
    options: { persist?: boolean } = {}
  ): AdminImportResult {
    const persist = options.persist ?? false;
    const errors: string[] = [];
    let added = 0;
    let duplicates = 0;
    let failed = 0;
    const nowIso = new Date().toISOString();
    const persistedBatch: RawScentoPerfume[] = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec || typeof rec !== 'object') {
        failed += 1;
        this.failedImports += 1;
        errors.push(`Row ${i + 1}: invalid record object`);
        continue;
      }
      const raw: RawScentoPerfume = {
        ...rec,
        provider: rec.provider || 'Atelier Custom Import',
        license: rec.license || 'User Verified Entry',
      };
      const outcome = this.ingestRawRecord(
        raw,
        raw.provider!,
        raw.license!,
        nowIso
      );
      if (outcome === 'added') {
        added += 1;
        persistedBatch.push(raw);
      } else if (outcome === 'duplicate') {
        duplicates += 1;
      } else {
        failed += 1;
        errors.push(
          `Row ${i + 1} (${rec.name || 'unnamed'}): requires name, house, and at least 1 note`
        );
      }
    }

    if (added > 0) {
      this.lastUpdatedAt = nowIso;
      this.rebuildIndex();

      if (persist) {
        try {
          fs.mkdirSync(this.dataDir, { recursive: true });
          let existing: RawScentoPerfume[] = [];
          if (fs.existsSync(this.customFilePath)) {
            const parsed = JSON.parse(fs.readFileSync(this.customFilePath, 'utf8'));
            if (Array.isArray(parsed)) existing = parsed;
          }
          fs.writeFileSync(
            this.customFilePath,
            JSON.stringify([...existing, ...persistedBatch], null, 2),
            'utf8'
          );
        } catch (err) {
          errors.push(
            `Persistence warning: ${err instanceof Error ? err.message : 'failed writing custom store'}`
          );
        }
      }
    }

    return {
      added,
      duplicates,
      failed,
      errors,
      stats: this.getStats(),
    };
  }

  public getStats(): CatalogStats {
    let completePyramids = 0;
    let partialPyramids = 0;
    let flatNotesOnly = 0;
    let missingYears = 0;

    const sourceMap = new Map<
      string,
      { provider: string; license: string; url: string; count: number }
    >();

    for (const p of this.perfumes) {
      if (p.completeness === 'complete') completePyramids += 1;
      else if (p.completeness === 'partial') partialPyramids += 1;
      else flatNotesOnly += 1;

      if (p.releaseYear === null) missingYears += 1;

      const sKey = `${p.provenance.provider}::${p.provenance.license}`;
      const existing = sourceMap.get(sKey);
      if (existing) {
        existing.count += 1;
      } else {
        sourceMap.set(sKey, {
          provider: p.provenance.provider,
          license: p.provenance.license,
          url:
            p.provenance.provider === DEFAULT_ATTRIBUTION.provider
              ? DEFAULT_ATTRIBUTION.url
              : p.provenance.sourceUrl,
          count: 1,
        });
      }
    }

    return {
      totalPerfumes: this.perfumes.length,
      totalHouses: this.houseSet.size,
      totalMaterials: this.normalizer.getMaterialCount(),
      totalNormalizedNotesInCatalog: this.normalizedCatalogNotes.size,
      completePyramids,
      partialPyramids,
      flatNotesOnly,
      missingYears,
      duplicateCount: this.duplicateCount,
      failedImports: this.failedImports,
      lastUpdatedAt: this.lastUpdatedAt,
      sources: Array.from(sourceMap.values()).sort((a, b) => b.count - a.count),
    };
  }

  public queryCatalog(params: {
    page?: number;
    limit?: number;
    q?: string;
    source?: string;
    completeness?: DataCompletenessStatus | 'all';
  }): AdminCatalogPage {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(5, params.limit ?? 15));
    const q = (params.q ?? '').trim().toLowerCase();
    const source = (params.source ?? '').trim();
    const completeness = params.completeness ?? 'all';

    const filtered = this.perfumes.filter((p) => {
      if (completeness !== 'all' && p.completeness !== completeness) return false;
      if (source && p.provenance.provider !== source) return false;
      if (q) {
        const hay = `${p.name} ${p.house} ${p.family} ${p.allNoteNames.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const start = (page - 1) * limit;
    return {
      stats: this.getStats(),
      items: filtered.slice(start, start + limit),
      totalFiltered: filtered.length,
      page,
      limit,
    };
  }

  public getPerfumeCount(): number {
    return this.perfumes.length;
  }

  public getNormalizer(): NoteNormalizer {
    return this.normalizer;
  }
}

let singletonRepo: CatalogRepository | null = null;

export function getCatalogRepository(): CatalogRepository {
  if (!singletonRepo) {
    singletonRepo = new CatalogRepository();
    singletonRepo.loadFromDisk();
  }
  return singletonRepo;
}
