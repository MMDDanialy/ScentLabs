import { ATELIER_PRESETS, FRAGRANCE_NOTES } from '../data/catalog';
import type {
  BalanceDiagnostic,
  BalanceReport,
  BlendSelection,
  FragranceNote,
  GenderClassificationSource,
  MatchResult,
  NormalizedNoteEntry,
  NoteLayer,
  PerfumeGender,
  ScentProfile,
} from '../types/fragrance';
import { generateCompositionTitle } from '../engine/formulationEngine';
import { en } from './en';
import { fa } from './fa';
import type { Locale, LocalizedNoteCopy, LocalizedPresetCopy, TranslationResource } from './types';

const RESOURCES: Record<Locale, TranslationResource> = { en, fa };

export function getDictionary(locale: Locale): TranslationResource {
  return RESOURCES[locale] ?? en;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = params[key];
    return val !== undefined ? String(val) : '';
  });
}

export function resolveMessage(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const lookup = (obj: unknown, path: string[]): string | undefined => {
    let curr: unknown = obj;
    for (const part of path) {
      if (!curr || typeof curr !== 'object' || !(part in curr)) return undefined;
      curr = (curr as Record<string, unknown>)[part];
    }
    return typeof curr === 'string' ? curr : undefined;
  };

  const segments = key.split('.');
  const localized = lookup(getDictionary(locale), segments) ?? lookup(en, segments) ?? key;
  return interpolate(localized, params);
}

export function formatLocaleNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const tag = locale === 'fa' ? 'fa-IR' : 'en-US';
  try {
    return new Intl.NumberFormat(tag, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatLocaleDate(
  locale: Locale,
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const tag = locale === 'fa' ? 'fa-IR' : 'en-US';
  try {
    return new Intl.DateTimeFormat(tag, options).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function getLocalizedNote(locale: Locale, note: FragranceNote): LocalizedNoteCopy {
  const dict = getDictionary(locale);
  const hit = dict.domain.notes[note.id];
  if (hit) return hit;
  return {
    name: note.name,
    description: note.description,
    origin: note.origin,
    accords: note.accords,
  };
}

export function getLocalizedNoteNameByIdOrName(locale: Locale, rawIdOrName: string): string {
  const dict = getDictionary(locale);
  const byId = dict.domain.notes[rawIdOrName];
  if (byId) return byId.name;
  const note = FRAGRANCE_NOTES.find(
    (n) => n.id === rawIdOrName || n.name.toLowerCase() === rawIdOrName.toLowerCase()
  );
  if (note) return dict.domain.notes[note.id]?.name ?? note.name;
  return rawIdOrName;
}

export function getLocalizedPreset(
  locale: Locale,
  presetId: string
): LocalizedPresetCopy {
  const dict = getDictionary(locale);
  const hit = dict.domain.presets[presetId];
  if (hit) return hit;
  const fallback = ATELIER_PRESETS.find((p) => p.id === presetId);
  return {
    name: fallback?.name ?? presetId,
    subtitle: fallback?.subtitle ?? '',
  };
}

export function getLocalizedFamily(locale: Locale, family: string): string {
  const dict = getDictionary(locale);
  const famMap = dict.domain.families as Record<string, string>;
  return famMap[family] ?? family;
}

export function getLocalizedLayer(locale: Locale, layer: NoteLayer): string {
  return getDictionary(locale).domain.layers[layer] ?? layer;
}

export function getLocalizedGender(locale: Locale, gender: PerfumeGender | undefined): string {
  const g: PerfumeGender = gender ?? 'unknown';
  return getDictionary(locale).domain.genders[g] ?? g;
}

export function getLocalizedGenderSource(
  locale: Locale,
  source: GenderClassificationSource | undefined
): string {
  const s: GenderClassificationSource = source ?? 'unknown';
  return getDictionary(locale).domain.genderSources[s] ?? s;
}

export function getLocalizedAccord(locale: Locale, accord: string): string {
  if (locale === 'en') return accord;
  const map = getDictionary(locale).domain.accords;
  return map[accord] ?? map[accord.toLowerCase()] ?? accord;
}

export function getLocalizedMoodTag(locale: Locale, tag: string): string {
  return getDictionary(locale).domain.moodTags[tag] ?? tag;
}

export function getLocalizedSeasonTag(locale: Locale, tag: string): string {
  return getDictionary(locale).domain.seasonTags[tag] ?? tag;
}

export function getLocalizedDiagnostic(
  locale: Locale,
  diag: BalanceDiagnostic,
  balance: BalanceReport
): { title: string; detail: string; suggestion: string } {
  if (locale === 'en') {
    return { title: diag.title, detail: diag.detail, suggestion: diag.suggestion };
  }
  const n = (v: number) => formatLocaleNumber(locale, v);
  const p = balance.pyramid;
  const f = balance.facets;

  switch (diag.id) {
    case 'empty-vessel':
      return {
        title: 'در انتظار قطره‌های نخستین',
        detail: 'هنوز هیچ نتی به ظرف ترکیب افزوده نشده است.',
        suggestion: 'با ۲ تا ۴ قطره نت آغازین درخشان، ۳ تا ۵ قطره نت میانی و ۳ تا ۵ قطره نت پایه شروع کنید.',
      };
    case 'low-top':
      return {
        title: 'شروع ملایم و کم‌فراز',
        detail: `نت‌های آغازین تنها ${n(p.top)}٪ ترکیب را تشکیل می‌دهند؛ بنابراین عطر ممکن است بدون بازشدن درخشان، سنگین آغاز شود.`,
        suggestion: 'برای شفاف‌تر کردن لحظه نخست، ۲ تا ۳ قطره ترنج کالابریا، لیمو یا فلفل صورتی اضافه کنید.',
      };
    case 'high-top':
      return {
        title: 'تمرکز بالای نت‌های فرّار',
        detail: `نت‌های آغازین ${n(p.top)}٪ فرمول را تشکیل می‌دهند که شروعی سریع اما با عمق ساختاری کمتر ایجاد می‌کند.`,
        suggestion: 'شروع پرشتاب را با چوب صندل، سدر یا رزین کهربایی لابدانوم تثبیت کنید.',
      };
    case 'low-heart':
      return {
        title: 'پل میانی کم‌حجم',
        detail: `نت‌های میانی در سطح ${n(p.heart)}٪ قرار دارند که گذار میان آغاز و پایه را تندتر می‌کند.`,
        suggestion: 'رز دمشقی، هل سبز، اسطوخودوس یا کره زنبق را برای ایجاد قلبی منسجم اضافه کنید.',
      };
    case 'low-base':
      return {
        title: 'تکیه‌گاه ساختاری سبک',
        detail: `نت‌های پایه تنها ${n(p.base)}٪ ترکیب را می‌سازند و ته‌بویی سبک و زودگذر ایجاد می‌کنند.`,
        suggestion: 'بنیان عطر را با مشک سفید، چوب صندل، خس‌خس یا دانه تونکا عمیق‌تر کنید.',
      };
    case 'heavy-base':
      return {
        title: 'غلبه‌ سنگین رزین و پایه',
        detail: `نت‌های پایه با ${n(p.base)}٪ غلبه دارند و پروفایلی متراکم و کم‌نوسان می‌سازند.`,
        suggestion: 'با افزودن ترنج کالابریا، گریپ‌فروت یا توت ارس کوهستانی به این سنگینی روشنایی ببخشید.',
      };
    case 'over-warm':
      return {
        title: 'کنتراست طراوت پایین',
        detail: `شاخص گرمی ${n(f.warmth)} از ۱۰۰ است در حالی که شادابی در سطح ${n(f.freshness)} از ۱۰۰ قرار دارد.`,
        suggestion: 'مقداری اندک پوست مرکبات یا هل سبز، کنتراستی درخشان و متعادل ایجاد می‌کند.',
      };
    case 'high-sweetness':
      return {
        title: 'شیرینی غنی و گورماند',
        detail: `شیرینی برابر با ${n(f.sweetness)} از ۱۰۰ است و تضاد چوبی یا معدنی خشک آن محدود مانده است.`,
        suggestion: 'شیرینی را با چوب سدر اطلس، خس‌خس هائیتی یا نمک دریایی اطلس متعادل کنید.',
      };
    case 'single-note':
      return {
        title: 'مطالعه تک‌نت (سولیفلور)',
        detail: 'در حال حاضر تنها یک ماده معطر در ظرف ترکیب فعال است.',
        suggestion: 'برای ساخت یک هرم سه‌لایه کلاسیک، دست‌کم با دو لایه مکمل دیگر ترکیب کنید.',
      };
    case 'single-tier':
      return {
        title: 'تمرکز بر یک لایه هرم',
        detail: 'تمام مواد انتخاب‌شده در یک لایه قرار دارند و تضاد ساختاری سایر لایه‌ها در فرمول دیده نمی‌شود.',
        suggestion: 'برای شکل‌گیری تحول تدریجی رایحه، نت‌هایی از لایه‌های مکمل اضافه کنید.',
      };
    case 'well-proportioned':
      return {
        title: 'معماری سه‌لایه متوازن',
        detail: `توزیع متعادل ${n(p.top)}٪ آغازین / ${n(p.heart)}٪ میانی / ${n(p.base)}٪ پایه همراه با تضاد مکمل.`,
        suggestion: 'ترکیب شما به‌خوبی کالیبره شده و آماده تقطیر یا تنظیم‌های ظریف نهایی است.',
      };
    default:
      return { title: diag.title, detail: diag.detail, suggestion: diag.suggestion };
  }
}

export function getLocalizedBalanceSummary(locale: Locale, balance: BalanceReport): string {
  if (locale === 'en') return balance.summary;
  const n = (v: number) => formatLocaleNumber(locale, v);
  const p = balance.pyramid;
  if (balance.totalDrops === 0) {
    return 'ظرف ترکیب خالی است. برای بررسی تعادل هرم، قطره‌هایی از نت‌های آغازین، میانی و پایه اضافه کنید.';
  }
  const famLabel = balance.dominantFamily
    ? getLocalizedFamily(locale, balance.dominantFamily)
    : 'چندوجهی';
  if (balance.overallStatus === 'balanced') {
    return `ترکیب ${famLabel} متعادل و خوش‌ساخت (هرم ${n(p.top)}/${n(p.heart)}/${n(p.base)}).`;
  }
  if (balance.overallStatus === 'advisory') {
    return `ترکیب ${famLabel} بیانگر با ظرفیت تنظیم ظریف میان لایه‌ها.`;
  }
  return `نسبت هرم ${n(p.top)}/${n(p.heart)}/${n(p.base)} به‌شدت نامتوازن است — راهنمای تعادل زیر را ببینید.`;
}

export function getLocalizedScentProfile(
  locale: Locale,
  profile: ScentProfile
): { label: string; summary: string } {
  if (locale === 'en') {
    return { label: profile.label, summary: profile.summary };
  }
  const dict = getDictionary(locale);
  const tempLabel =
    profile.temperaturePreference === 'fresh'
      ? 'درخشان و خنک'
      : profile.temperaturePreference === 'warm'
      ? 'گرم و کهربایی'
      : 'متعادل';
  const topFamilies = profile.preferredFamilies.slice(0, 2).map((f) => getLocalizedFamily(locale, f));
  const famText = topFamilies.length > 0 ? topFamilies.join(' / ') : 'چندوجهی';
  const moodLabel = dict.discovery.moodOptions[profile.mood]?.label ?? profile.mood;
  const intensityLabel = dict.discovery.intensityOptions[profile.intensityPreference];

  return {
    label: `${tempLabel} · ${famText}`,
    summary: `طراحی‌شده برای حال‌وهوای «${moodLabel}» با حضور ${intensityLabel} در محور آکوردهای ${famText}.`,
  };
}

export function getLocalizedMatchExplanation(locale: Locale, match: MatchResult): string {
  if (locale === 'en') return match.explanation;
  const details = match.matchedDetails ?? [];
  const exactCount = details.filter((d) => d.matchType === 'exact').length;
  const relatedCount = details.filter((d) => d.matchType === 'related').length;
  const alignedCount = details.filter((d) => d.tierAligned).length;
  const shareSum = Math.round(details.reduce((s, d) => s + d.userShare, 0));
  const n = (v: number) => formatLocaleNumber(locale, v);

  if (exactCount > 0) {
    return `${n(exactCount)} نت استاندارد دقیقاً تطبیق یافت${
      match.perfume.pyramidComplete && alignedCount > 0
        ? ` (${n(alignedCount)} نت در لایه هم‌تراز هرم)`
        : ''
    }؛ هم‌سویی وزنی ترکیب ${n(shareSum)}٪.`;
  }
  if (relatedCount > 0) {
    return `پیوند از طریق ${n(relatedCount)} خانواده ماده معطر خویشاوند و آکوردهای مشترک (${
      match.sharedAccords.slice(0, 2).map((a) => getLocalizedAccord(locale, a)).join(' / ') || 'نزدیکی وجوه'
    }).`;
  }
  return `شباهت اکتشافی عمدتاً بر پایه نزدیکی شاخص‌های کاراکتر (${
    match.sharedAccords.slice(0, 2).map((a) => getLocalizedAccord(locale, a)).join(' / ') ||
    match.perfume.family
  }).`;
}

export function getLocalizedMatchDifferences(
  locale: Locale,
  match: MatchResult,
  _selection?: BlendSelection
): string[] {
  if (locale === 'en') return match.keyDifferences;
  return match.keyDifferences.map((diff) => {
    if (diff.startsWith('Reference includes ') && diff.endsWith(' absent in your blend')) {
      const notesStr = diff
        .replace('Reference includes ', '')
        .replace(' absent in your blend', '');
      return `عطر مرجع شامل ${notesStr} است که در ترکیب شما وجود ندارد`;
    }
    if (diff.startsWith('Your formula introduces ')) {
      const notesStr = diff.replace('Your formula introduces ', '');
      const localized = notesStr
        .split(' & ')
        .map((n) => getLocalizedNoteNameByIdOrName('fa', n))
        .join(' و ');
      return `فرمول شما شامل ${localized} است`;
    }
    if (diff.startsWith('Reference catalog entry lists flat notes only')) {
      return 'رکورد کاتالوگ مرجع فقط فهرست نت دارد (ساختار هرم ثبت نشده است)';
    }
    if (diff.startsWith('Single-tier user formula concentrates 100%')) {
      return 'فرمول شما ۱۰۰٪ بر یک لایه متمرکز است در حالی که عطر مرجع هرم سه‌لایه کامل دارد';
    }
    if (diff.includes('Closely aligned')) {
      return 'تطبیق نزدیک در مواد تشکیل‌دهنده و نسبت‌های هرم بویایی';
    }
    return diff;
  });
}

export function getLocalizedDeterministicCritique(
  locale: Locale,
  fragranceName: string,
  entries: NormalizedNoteEntry[],
  balance: BalanceReport,
  topMatch: MatchResult | null
): string {
  if (locale === 'en') {
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

  const n = (v: number) => formatLocaleNumber('fa', v);
  const topNotes = entries
    .filter((e) => e.note.layer === 'top')
    .map((e) => getLocalizedNoteNameByIdOrName('fa', e.note.id));
  const heartNotes = entries
    .filter((e) => e.note.layer === 'heart')
    .map((e) => getLocalizedNoteNameByIdOrName('fa', e.note.id));
  const baseNotes = entries
    .filter((e) => e.note.layer === 'base')
    .map((e) => getLocalizedNoteNameByIdOrName('fa', e.note.id));

  const openingClause =
    topNotes.length > 0
      ? `با ${topNotes.slice(0, 2).join(' و ')} (${n(balance.pyramid.top)}٪ سهم آغازین) گشوده می‌شود`
      : `از شروع مرکباتی فرّار عبور کرده و مستقیماً به تراکم قلب رایحه می‌رسد`;
  const heartClause =
    heartNotes.length > 0
      ? `از میان هسته‌ای با محوریت ${heartNotes.slice(0, 2).join(' و ')} (${n(balance.pyramid.heart)}٪ سهم میانی) عبور می‌کند`
      : `بدون لنگر میانی مجزا، به‌سرعت به سمت لایه خشک‌شدن حرکت می‌کند`;
  const baseClause =
    baseNotes.length > 0
      ? `و بر بستر ${baseNotes.slice(0, 2).join(' و ')} (${n(balance.pyramid.base)}٪ سهم پایه) آرام می‌گیرد`
      : `و به‌شکل آگاهانه بدون پایه رزینی سنگین، سبک باقی می‌ماند`;
  const accordText =
    balance.dominantAccords.length > 0
      ? balance.dominantAccords
          .slice(0, 2)
          .map((a) => getLocalizedAccord('fa', a.accord))
          .join(' و ')
      : 'ظریف';
  const matchSentence = topMatch
    ? `در کاتالوگ الگوریتمی داخلی ما، این ساختار ${n(topMatch.similarityScore)}٪ نزدیکی پروفایل با ${topMatch.perfume.name} (${topMatch.perfume.house}) دارد${
        topMatch.sharedNotes.length > 0
          ? ` که بر پایه اشتراک ${topMatch.sharedNotes
              .slice(0, 2)
              .map((sn) => getLocalizedNoteNameByIdOrName('fa', sn))
              .join(' و ')} شکل گرفته است.`
          : '.'
      }`
    : '';
  const balanceTone =
    balance.overallStatus === 'balanced'
      ? 'متوازن و از نظر ساختاری سنجیده'
      : 'پُرشخصیت و دارای تأکید جهت‌دار مشخص';

  return `${fragranceName || 'این ترکیب'} ${openingClause}، ${heartClause} ${baseClause}. این فرمول با محوریت وجوه ${accordText}، تعادلی ${balanceTone} از خود نشان می‌دهد. ${matchSentence}`.trim();
}

export function getLocalizedCompositionTitle(
  locale: Locale,
  entries: NormalizedNoteEntry[],
  balance: BalanceReport
): string {
  if (locale === 'en') {
    return generateCompositionTitle(entries, balance);
  }
  if (entries.length === 0) return 'ترکیب آتلیه';

  const ranked = [...entries].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.note.intensity - a.note.intensity;
  });

  const lead = getLocalizedNoteNameByIdOrName('fa', ranked[0].note.id);
  const second = ranked[1] ? getLocalizedNoteNameByIdOrName('fa', ranked[1].note.id) : null;
  const { pyramid, facets, dominantFamily } = balance;

  let motif = 'آکورد';
  if (pyramid.top >= 55 && facets.freshness >= 70) {
    motif = 'کُلن آفتابی';
  } else if (facets.smokiness >= 48) {
    motif = facets.warmth >= 68 ? 'رزرو اخگر و دود' : 'نگارش ابسیدین';
  } else if (facets.floralcy >= 64) {
    motif = facets.freshness >= 45 ? 'شکوفه درخشان' : 'الکسیر مخملی';
  } else if (facets.warmth >= 72 && facets.sweetness >= 60) {
    motif = 'طلایی مخمل';
  } else if (facets.dryness >= 72) {
    motif = 'سیلوئت خشک';
  } else if (facets.freshness >= 64) {
    motif = 'نسیم شفاف';
  } else if (pyramid.base >= 52) {
    motif = 'عصاره عمیق';
  } else if (dominantFamily === 'Aromatic & Herbal') {
    motif = 'فوژر گیاهی';
  } else if (dominantFamily === 'Spicy') {
    motif = 'مطالعه ادویه‌ای';
  }

  if (second && ranked[0].percentage < 46 && ranked[1].percentage >= 18) {
    return `${motif} ${lead} و ${second}`;
  }
  return `${motif} ${lead}`;
}
