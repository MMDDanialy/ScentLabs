import type { GenderClassificationSource, PerfumeGender } from '../types/fragrance';

export interface GenderClassificationResult {
  gender: PerfumeGender;
  source: GenderClassificationSource;
}

/**
 * Curated documented unisex/shared releases present in Scento's catalog.
 * Only lines explicitly marketed and documented by their houses as unisex /
 * gender-neutral are listed here, and explicit gendered flanker names
 * ("Pour Homme", "For Her", etc.) always take precedence.
 */
const CURATED_UNISEX_EXACT_IDS = new Set<string>([
  'calvin-klein-ck-one-toilette',
  'calvin-klein-ck-everyone',
  'mfk-baccarat-rouge-540',
  'mfk-baccarat-rouge-540-extrait',
  'tom-ford-oud-wood',
  'tom-ford-tobacco-vanille',
  'tom-ford-neroli-portofino',
  'tom-ford-neroli-portofino-parfum',
  'tom-ford-lost-cherry',
  'tom-ford-ebene-fume',
  'tom-ford-soleil-blanc',
  'tom-ford-fucking-fabulous',
  'creed-silver-mountain-water',
  'creed-virgin-island-water',
  'creed-millesime-imperial',
  'initio-oud-for-greatness',
  'initio-oud-for-greatness-neo',
  'initio-side-effect',
  'initio-rehab',
  'initio-musk-therapy',
  'xerjoff-naxos',
  'xerjoff-erba-pura',
  'nishane-hacivat',
  'nishane-ani',
  'nishane-wulong-cha',
]);

const CURATED_UNISEX_HOUSE_IDS = new Set<string>([
  'byredo',
  'le-labo',
  'diptyque',
  'jo-malone-london',
  'jo-malone',
  'maison-margiela',
  'atelier-cologne',
]);

function normalizeExplicitField(raw: string): PerfumeGender | null {
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;
  if (
    clean === 'masculine' ||
    clean === 'male' ||
    clean === 'men' ||
    clean === 'man' ||
    clean === 'for men' ||
    clean === 'pour homme' ||
    clean === 'homme'
  ) {
    return 'masculine';
  }
  if (
    clean === 'feminine' ||
    clean === 'female' ||
    clean === 'women' ||
    clean === 'woman' ||
    clean === 'for women' ||
    clean === 'pour femme' ||
    clean === 'femme'
  ) {
    return 'feminine';
  }
  if (
    clean === 'unisex' ||
    clean === 'shared' ||
    clean === 'all' ||
    clean === 'genderless' ||
    clean === 'neutral'
  ) {
    return 'unisex';
  }
  if (clean === 'unknown' || clean === 'unrecorded') {
    return 'unknown';
  }
  return null;
}

/**
 * Classifies reference perfume gender strictly from documented metadata,
 * explicit product title designations, explicit audience descriptions,
 * or verified unisex collection records.
 *
 * NEVER infers gender from fragrance notes, accords, or olfactory family.
 * Defaults honestly to 'unknown' when metadata is unavailable.
 */
export function classifyPerfumeGender(input: {
  id?: string;
  name: string;
  houseId?: string;
  house?: string;
  description?: string;
  explicitGender?: string | null;
}): GenderClassificationResult {
  if (input.explicitGender) {
    const parsed = normalizeExplicitField(input.explicitGender);
    if (parsed) {
      return {
        gender: parsed,
        source: parsed === 'unknown' ? 'unknown' : 'explicit-metadata',
      };
    }
  }

  const name = (input.name ?? '').trim();
  const desc = (input.description ?? '').trim();
  const id = (input.id ?? '').trim().toLowerCase();
  const houseId = (input.houseId ?? '').trim().toLowerCase();
  const houseSlug = (input.house ?? '').trim().toLowerCase().replace(/\s+/g, '-');

  // Remove idiomatic false-positive phrase "No Man's Land" before checking standalone "man"
  const safeName = name.replace(/no\s+man['’]?s\s+land/gi, '');

  // Explicit unisex designation in title or description takes precedence if dual-gendered
  if (
    /\b(unisex|for men and women|for women and men|all genders|genderless|gender-neutral|shared fragrance)\b/i.test(
      `${safeName} ${desc}`
    )
  ) {
    return { gender: 'unisex', source: 'title-designation' };
  }

  // Explicit masculine title designation
  if (
    /\b(pour homme|for men|for him|le male|gentleman|uomo|hombre|masculin|l'homme)\b/i.test(
      safeName
    ) ||
    /\b(homme|man)\b/i.test(safeName)
  ) {
    return { gender: 'masculine', source: 'title-designation' };
  }

  // Explicit feminine title designation
  if (
    /\b(pour femme|for women|for her|la femme|woman|donna|feminin|femme)\b/i.test(
      safeName
    )
  ) {
    return { gender: 'feminine', source: 'title-designation' };
  }

  // Explicit audience statements in catalog descriptions
  if (
    /\b(men's scent|gentleman's scent|fragrance for men|scent for men|perfume for men|for men|for him)\b/i.test(
      desc
    )
  ) {
    return { gender: 'masculine', source: 'description-statement' };
  }

  if (
    /\b(women's scent|fragrance for women|scent for women|perfume for women|floral for women|for women|for her)\b/i.test(
      desc
    )
  ) {
    return { gender: 'feminine', source: 'description-statement' };
  }

  // Verified unisex flagship releases & houses marketed strictly as unisex/shared
  if (
    CURATED_UNISEX_EXACT_IDS.has(id) ||
    CURATED_UNISEX_HOUSE_IDS.has(houseId) ||
    CURATED_UNISEX_HOUSE_IDS.has(houseSlug) ||
    id.startsWith('byredo-') ||
    id.startsWith('le-labo-') ||
    id.startsWith('diptyque-') ||
    id.startsWith('jo-malone-') ||
    id.startsWith('maison-margiela-') ||
    id.startsWith('acqua-di-parma-colonia') ||
    id.startsWith('acqua-di-parma-blu-mediterraneo')
  ) {
    return { gender: 'unisex', source: 'curated-unisex-registry' };
  }

  return { gender: 'unknown', source: 'unknown' };
}
