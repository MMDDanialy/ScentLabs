export interface CanonicalMaterial {
  id: string;
  name: string;
  aliases: string[];
  materialFamily: string;
  origin: string;
  smell: string;
  url: string;
}

export interface NormalizedNoteResolution {
  canonicalId: string;
  displayName: string;
  materialFamily: string | null;
  relatedIds: string[];
  matchSource: 'exact-id' | 'material-name' | 'material-alias' | 'curated-synonym' | 'slug-fallback';
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      if (csvText[i + 1] === '\n') {
        i += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export function normalizeNoteKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®*]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugifyNoteKey(raw: string): string {
  return normalizeNoteKey(raw).replace(/\s+/g, '-');
}

/**
 * Curated synonym bridge mapping Virtual Perfume Lab note IDs and common
 * perfumery phrasing / botanical variants to canonical Scento material IDs.
 * Distinct materials (e.g., pink-pepper vs pepper, sandalwood vs cedarwood,
 * mandarin vs lemon, orange-blossom vs orange) are strictly kept separate.
 */
const CURATED_SYNONYMS: Record<string, string> = {
  // Lab note IDs & display names
  'sea salt': 'salt',
  'sea-salt': 'salt',
  'atlantic sea salt': 'salt',
  'fleur de sel': 'salt',
  'oud smoke': 'oud',
  'oud-smoke': 'oud',
  'dark agarwood smoke': 'oud',
  'agarwood': 'oud',
  'agarwood oud': 'oud',
  'cambodian oud': 'oud',
  'black tea': 'smoked-tea',
  'black-tea': 'smoked-tea',
  'smoked black tea': 'smoked-tea',
  'lapsang souchong': 'smoked-tea',
  'jasmine sambac': 'jasmine-sambac',
  'arabian jasmine': 'jasmine-sambac',
  'silk white musk': 'musk',
  'white musk': 'musk',
  'clean musk': 'musk',
  'labdanum amber resin': 'amber',
  'amber resin': 'amber',
  'madagascar vanilla absolute': 'vanilla',
  'bourbon vanilla': 'vanilla',
  'vanilla absolute': 'vanilla',
  'venezuelan tonka bean': 'tonka-bean',
  'tonka': 'tonka-bean',
  'roasted tonka': 'tonka-bean',
  'florentine iris butter': 'iris',
  'iris butter': 'iris',
  'orris': 'iris',
  'orris root': 'iris',
  'orris butter': 'iris',
  'pallida iris': 'iris',
  'calabrian bergamot': 'bergamot',
  'amalfi lemon': 'lemon',
  'sicilian lemon': 'lemon',
  'blood mandarin': 'mandarin',
  'mandarin orange': 'mandarin',
  'pink peppercorn': 'pink-pepper',
  'pink pepper': 'pink-pepper',
  'ruby grapefruit': 'grapefruit',
  'pink grapefruit': 'grapefruit',
  'tunisian neroli': 'neroli',
  'bitter orange blossom': 'orange-blossom',
  'alpine juniper berry': 'juniper',
  'juniper berry': 'juniper',
  'juniper berries': 'juniper',
  'paraguayan petitgrain': 'petitgrain',
  'damask rose': 'rose',
  'turkish rose': 'rose',
  'may rose': 'rose',
  'rose de mai': 'rose',
  'bulgarian rose': 'rose',
  'haute provence lavender': 'lavender',
  'french lavender': 'lavender',
  'green cardamom': 'cardamom',
  'guatemalan cardamom': 'cardamom',
  'ceylon cinnamon bark': 'cinnamon',
  'ceylon cinnamon': 'cinnamon',
  'cinnamon bark': 'cinnamon',
  'kashmir saffron': 'saffron',
  'saffron threads': 'saffron',
  'bourbon geranium': 'geranium',
  'egyptian geranium': 'geranium',
  'pelargonium': 'geranium',
  'mysore sandalwood': 'sandalwood',
  'australian sandalwood': 'sandalwood',
  'santal': 'sandalwood',
  'atlas cedarwood': 'cedarwood',
  'atlas cedar': 'cedarwood',
  'virginia cedar': 'cedarwood',
  'virginia cedarwood': 'cedarwood',
  'cedar': 'cedarwood',
  'aged indonesian patchouli': 'patchouli',
  'indonesian patchouli': 'patchouli',
  'patchouli leaf': 'patchouli',
  'haitian vetiver': 'vetiver',
  'bourbon vetiver': 'vetiver',
  'java vetiver': 'vetiver',
  // Common catalog variants
  'black pepper': 'pepper',
  'pink pepper co2': 'pink-pepper',
  'ambergris accord': 'ambergris',
  'ambrox': 'ambroxan',
  'neroli oil': 'neroli',
  'black tea leaf': 'tea',
  'sea notes': 'sea-notes',
  'marine notes': 'sea-notes',
};

/**
 * Related material links allow controlled cross-recognition of close aromatic
 * cousins (e.g., Jasmine Sambac <-> Jasmine, Smoked Tea <-> Tea, Salt <-> Sea Notes)
 * at a discounted partial weight without conflating exact identities.
 */
const RELATED_MATERIAL_GROUPS: string[][] = [
  ['jasmine-sambac', 'jasmine', 'night-blooming-jasmine', 'hedione'],
  ['smoked-tea', 'tea', 'oolong-tea', 'green-tea', 'white-tea', 'black-tea', 'mate'],
  ['oud', 'birch', 'incense', 'smoke', 'guaiac-wood', 'leather'],
  ['salt', 'sea-notes', 'marine-notes', 'driftwood', 'seaweed'],
  ['amber', 'labdanum', 'ambroxan', 'ambergris', 'benzoin', 'opoponax'],
  ['neroli', 'orange-blossom', 'petitgrain'],
  ['iris', 'orris', 'violet', 'violet-leaf'],
  ['vanilla', 'tonka-bean', 'coumarin'],
  ['rose', 'tea-rose', 'geranium'],
  ['bergamot', 'lemon', 'cedrat', 'mandarin', 'grapefruit'],
  ['cedarwood', 'cypress', 'pine', 'juniper'],
  ['patchouli', 'vetiver', 'oakmoss'],
  ['cardamom', 'cinnamon', 'nutmeg', 'ginger'],
];

export class NoteNormalizer {
  private readonly materialsById = new Map<string, CanonicalMaterial>();
  private readonly lookupByKey = new Map<
    string,
    { id: string; source: NormalizedNoteResolution['matchSource'] }
  >();
  private readonly relatedMap = new Map<string, Set<string>>();

  constructor(materials: CanonicalMaterial[] = []) {
    for (const mat of materials) {
      this.materialsById.set(mat.id, mat);
      this.registerKey(mat.id, mat.id, 'exact-id');
      this.registerKey(mat.name, mat.id, 'material-name');
      for (const alias of mat.aliases) {
        if (alias.trim()) {
          this.registerKey(alias, mat.id, 'material-alias');
        }
      }
    }

    for (const [synonym, targetId] of Object.entries(CURATED_SYNONYMS)) {
      const normalized = normalizeNoteKey(synonym);
      if (!this.lookupByKey.has(normalized)) {
        this.lookupByKey.set(normalized, { id: targetId, source: 'curated-synonym' });
      }
      const slug = slugifyNoteKey(synonym);
      if (!this.lookupByKey.has(slug)) {
        this.lookupByKey.set(slug, { id: targetId, source: 'curated-synonym' });
      }
    }

    for (const group of RELATED_MATERIAL_GROUPS) {
      for (const id of group) {
        if (!this.relatedMap.has(id)) {
          this.relatedMap.set(id, new Set());
        }
        for (const peer of group) {
          if (peer !== id) {
            this.relatedMap.get(id)!.add(peer);
          }
        }
      }
    }
  }

  private registerKey(
    raw: string,
    canonicalId: string,
    source: NormalizedNoteResolution['matchSource']
  ) {
    const normalized = normalizeNoteKey(raw);
    if (normalized && !this.lookupByKey.has(normalized)) {
      this.lookupByKey.set(normalized, { id: canonicalId, source });
    }
    const slug = slugifyNoteKey(raw);
    if (slug && !this.lookupByKey.has(slug)) {
      this.lookupByKey.set(slug, { id: canonicalId, source });
    }
  }

  public static fromMaterialsCsv(csvText: string): NoteNormalizer {
    const rows = parseCsvRows(csvText);
    if (rows.length <= 1) return new NoteNormalizer([]);
    const header = rows[0].map((h) => h.toLowerCase());
    const idx = (col: string) => header.indexOf(col);

    const idCol = idx('id');
    const nameCol = idx('name');
    const aliasesCol = idx('aliases');
    const famCol = idx('material_family');
    const originCol = idx('origin');
    const smellCol = idx('smell');
    const urlCol = idx('url');

    const materials: CanonicalMaterial[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = (row[idCol] ?? '').trim();
      const name = (row[nameCol] ?? '').trim();
      if (!id || !name) continue;
      const aliasesRaw = (row[aliasesCol] ?? '').trim();
      const aliases = aliasesRaw
        ? aliasesRaw
            .split(';')
            .map((a) => a.trim())
            .filter(Boolean)
        : [];
      materials.push({
        id,
        name,
        aliases,
        materialFamily: (row[famCol] ?? '').trim(),
        origin: (row[originCol] ?? '').trim(),
        smell: (row[smellCol] ?? '').trim(),
        url: (row[urlCol] ?? '').trim(),
      });
    }

    return new NoteNormalizer(materials);
  }

  public getMaterialCount(): number {
    return this.materialsById.size;
  }

  public getMaterial(canonicalId: string): CanonicalMaterial | undefined {
    return this.materialsById.get(canonicalId);
  }

  public getRelatedIds(canonicalId: string): string[] {
    return Array.from(this.relatedMap.get(canonicalId) ?? []);
  }

  public resolve(rawNote: string): NormalizedNoteResolution {
    const trimmed = rawNote.trim();
    const norm = normalizeNoteKey(trimmed);
    const slug = slugifyNoteKey(trimmed);

    // Check curated lab overrides first if exact slug matches a distinct lab note ID
    const curatedHit = CURATED_SYNONYMS[norm] ?? CURATED_SYNONYMS[slug];
    if (curatedHit) {
      const mat = this.materialsById.get(curatedHit);
      return {
        canonicalId: curatedHit,
        displayName: mat?.name ?? trimmed,
        materialFamily: mat?.materialFamily || null,
        relatedIds: this.getRelatedIds(curatedHit),
        matchSource: 'curated-synonym',
      };
    }

    const hit = this.lookupByKey.get(norm) ?? this.lookupByKey.get(slug);
    if (hit) {
      const mat = this.materialsById.get(hit.id);
      return {
        canonicalId: hit.id,
        displayName: mat?.name ?? trimmed,
        materialFamily: mat?.materialFamily || null,
        relatedIds: this.getRelatedIds(hit.id),
        matchSource: hit.source,
      };
    }

    // Gentle stripping of trailing descriptors like "accord", "absolute", "oil", "essence"
    const stripped = norm
      .replace(/\b(absolute|oil|essence|extract|resinoid|resin|co2|butter|leaves|leaf|zest|peel)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped && stripped !== norm) {
      const strippedHit =
        this.lookupByKey.get(stripped) ??
        this.lookupByKey.get(stripped.replace(/\s+/g, '-'));
      if (strippedHit) {
        const mat = this.materialsById.get(strippedHit.id);
        return {
          canonicalId: strippedHit.id,
          displayName: mat?.name ?? trimmed,
          materialFamily: mat?.materialFamily || null,
          relatedIds: this.getRelatedIds(strippedHit.id),
          matchSource: strippedHit.source,
        };
      }
    }

    const fallbackId = slug || 'unknown-note';
    return {
      canonicalId: fallbackId,
      displayName: trimmed || fallbackId,
      materialFamily: null,
      relatedIds: this.getRelatedIds(fallbackId),
      matchSource: 'slug-fallback',
    };
  }
}
