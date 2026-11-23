import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { ATELIER_PRESETS, FRAGRANCE_NOTES, OLFACTORY_FAMILIES } from '../data/catalog';
import { buildScentProfile } from '../engine/formulationEngine';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type {
  AtelierMood,
  AtelierPreset,
  BlendSelection,
  IntensityPreference,
  OlfactoryFamily,
  ScentProfile,
  TemperaturePreference,
} from '../types/fragrance';

interface DiscoveryFlowProps {
  referenceCount?: number;
  onApplyProfileAndEnter: (profile: ScentProfile, starterBlend: BlendSelection) => void;
  onEnterLabDirect: () => void;
  onLoadPreset: (preset: AtelierPreset) => void;
}

const MOOD_VALUES: AtelierMood[] = [
  'Daylight Atelier',
  'Evening Noir',
  'Botanical Solitude',
  'Velvet Ceremony',
];

export const DiscoveryFlow: React.FC<DiscoveryFlowProps> = ({
  referenceCount,
  onApplyProfileAndEnter,
  onEnterLabDirect,
  onLoadPreset,
}) => {
  const {
    dict,
    t,
    formatNumber,
    getNoteCopy,
    getPresetCopy,
    getFamilyLabel,
    getLayerLabel,
    getProfileCopy,
  } = useI18n();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [selectedFamilies, setSelectedFamilies] = useState<OlfactoryFamily[]>([
    'Woody',
    'Amber & Oriental',
  ]);
  const [temperature, setTemperature] = useState<TemperaturePreference>('warm');
  const [intensity, setIntensity] = useState<IntensityPreference>('moderate');
  const [mood, setMood] = useState<AtelierMood>('Evening Noir');
  const [heroImgError, setHeroImgError] = useState(false);
  const [botanicalImgError, setBotanicalImgError] = useState(false);

  const toggleFamily = (family: OlfactoryFamily) => {
    setSelectedFamilies((prev) => {
      if (prev.includes(family)) {
        return prev.length > 1 ? prev.filter((f) => f !== family) : prev;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), family];
      }
      return [...prev, family];
    });
  };

  const profile = useMemo(
    () => buildScentProfile(selectedFamilies, temperature, intensity, mood, FRAGRANCE_NOTES),
    [selectedFamilies, temperature, intensity, mood]
  );

  const profileCopy = useMemo(() => getProfileCopy(profile), [getProfileCopy, profile]);

  const recommendedNotes = useMemo(
    () =>
      profile.recommendedNoteIds
        .map((id) => FRAGRANCE_NOTES.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n)),
    [profile.recommendedNoteIds]
  );

  const handleApplyAndEnter = () => {
    const starterBlend: BlendSelection = {};
    recommendedNotes.forEach((note, index) => {
      starterBlend[note.id] = index % 2 === 0 ? 3 : 2;
    });
    onApplyProfileAndEnter(profile, starterBlend);
  };

  const resetPreferences = () => {
    setSelectedFamilies(['Woody', 'Amber & Oriental']);
    setTemperature('warm');
    setIntensity('moderate');
    setMood('Evening Noir');
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-20">
      {/* Editorial Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-8 sm:pt-12 pb-14 border-b border-[var(--vpl-border-gold-soft)] items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between py-2">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-4">
              <div
                className={`shrink-0 ${
                  isLight
                    ? 'rounded-xl px-3.5 py-2 bg-[#14110D] border border-[var(--vpl-border-gold)] shadow-xs'
                    : ''
                }`}
              >
                <img
                  src="/virtual_perfume_lab_logo_transparent.png"
                  alt={dict.brand.logoAlt}
                  className="h-20 sm:h-24 w-auto object-contain shrink-0"
                />
              </div>
              <p className="text-xs font-mono tracking-wider uppercase text-[var(--vpl-accent)]">
                {dict.discovery.eyebrow}
              </p>
            </div>
            <h1
              className="font-serif text-[clamp(2.2rem,4.3vw,3.85rem)] font-semibold leading-[1.1] tracking-tight text-[var(--vpl-text)] mb-6"
              style={{ textWrap: 'balance' }}
            >
              {dict.discovery.headline}
            </h1>
            <p className="text-base sm:text-[17px] leading-relaxed text-[var(--vpl-text-body)] max-w-[58ch] mb-8">
              {dict.discovery.lead}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onEnterLabDirect}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-sm font-semibold hover:bg-[var(--vpl-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vpl-accent)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{dict.discovery.enterLab}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </button>

              <a
                href="#scent-discovery"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[var(--vpl-border-gold)] text-[var(--vpl-text)] text-sm font-medium hover:border-[var(--vpl-accent)] hover:bg-[var(--vpl-bg-card)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vpl-accent)] whitespace-nowrap shrink-0"
              >
                <span>{dict.discovery.buildProfile}</span>
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[var(--vpl-border)] grid grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                {formatNumber(27)}
              </div>
              <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                {dict.discovery.statNotesLabel}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                {dict.discovery.statTiersValue}
              </div>
              <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                {dict.discovery.statTiersLabel}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-[var(--vpl-text)] tabular-nums">
                {formatNumber(referenceCount ?? 1479)}
              </div>
              <div className="text-xs text-[var(--vpl-text-muted)] mt-1">
                {dict.discovery.statPerfumesLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-[var(--vpl-border-gold-soft)] bg-[#141210] min-h-[320px] lg:min-h-[460px]">
          {!heroImgError ? (
            <img
              src="/src/assets/images/atelier_hero_flask_1795443175826.jpg"
              alt={dict.discovery.heroImgAlt}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full object-cover lg:h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#1C1712] to-[#0D0B09]">
              <Sparkles className="w-8 h-8 text-[#D4AF6E] mb-3" aria-hidden="true" />
              <p className="font-serif text-xl text-[#F4EFE6]">{dict.discovery.heroFallbackTitle}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908]/85 via-[#0A0908]/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 start-5 end-5 flex items-end justify-between gap-4">
            <p className="text-xs font-mono text-[#E5DDD0] tracking-wide">
              {dict.discovery.heroCaption}
            </p>
          </div>
        </div>
      </section>

      {/* Curated Starter Accords */}
      <section className="py-10 border-b border-[var(--vpl-border)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
              {dict.discovery.presetsEyebrow}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--vpl-text)] mt-1">
              {dict.discovery.presetsTitle}
            </h2>
          </div>
          <p className="text-sm text-[var(--vpl-text-muted)]">{dict.discovery.presetsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ATELIER_PRESETS.map((preset) => {
            const presetCopy = getPresetCopy(preset.id);
            const totalUnits = Object.values(preset.selection).reduce((s, v) => s + v, 0);
            const noteCount = Object.keys(preset.selection).length;
            const noteNames = Object.keys(preset.selection)
              .slice(0, 3)
              .map((id) => {
                const found = FRAGRANCE_NOTES.find((n) => n.id === id);
                return found ? getNoteCopy(found).name : null;
              })
              .filter(Boolean)
              .join(' · ');

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onLoadPreset(preset)}
                className="group text-start p-5 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)] hover:border-[var(--vpl-border-gold)] hover:bg-[var(--vpl-bg-card-active)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--vpl-accent)] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-[var(--vpl-text-muted)] mb-2 tabular-nums">
                    {t('discovery.presetNotesDrops', {
                      notes: formatNumber(noteCount),
                      drops: formatNumber(totalUnits),
                    })}
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[var(--vpl-text)] group-hover:text-[var(--vpl-accent)] transition-colors">
                    {presetCopy.name}
                  </h3>
                  <p className="text-sm text-[var(--vpl-text-muted)] mt-1.5 leading-relaxed">
                    {presetCopy.subtitle}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--vpl-border-subtle)] flex items-center justify-between text-xs text-[var(--vpl-accent)]">
                  <span className="truncate">{noteNames}</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 shrink-0 ms-2 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Stage A: Scent Identity Discovery */}
      <section id="scent-discovery" className="pt-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-accent)]">
              {dict.discovery.stageEyebrow}
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[var(--vpl-text)] mt-1">
              {dict.discovery.stageTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{dict.discovery.resetPreferences}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Preference Cards */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Olfactory Families */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--vpl-text)]">
                  {dict.discovery.step1Title}
                </h3>
                <span className="text-xs font-mono text-[var(--vpl-text-muted)] tabular-nums">
                  {t('discovery.step1SelectedCount', {
                    count: formatNumber(selectedFamilies.length),
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {OLFACTORY_FAMILIES.map((family) => {
                  const active = selectedFamilies.includes(family);
                  return (
                    <button
                      key={family}
                      type="button"
                      onClick={() => toggleFamily(family)}
                      aria-pressed={active}
                      className={`px-3.5 py-2.5 rounded-lg border text-start text-xs font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[var(--vpl-accent-soft)] border-[var(--vpl-accent)] text-[var(--vpl-text)]'
                          : 'bg-[var(--vpl-bg-card)] border-[var(--vpl-border)] text-[var(--vpl-text-muted)] hover:border-[var(--vpl-border-strong)] hover:text-[var(--vpl-text)]'
                      }`}
                    >
                      <span className="truncate">{getFamilyLabel(family)}</span>
                      {active && (
                        <Check
                          className="w-3.5 h-3.5 text-[var(--vpl-accent)] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Thermal Balance & Intensity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--vpl-text)] mb-3">
                  {dict.discovery.step2Title}
                </h3>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  {(['fresh', 'balanced', 'warm'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTemperature(opt)}
                      aria-pressed={temperature === opt}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        temperature === opt
                          ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                          : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                      }`}
                    >
                      {dict.discovery.tempOptions[opt]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--vpl-text)] mb-3">
                  {dict.discovery.step3Title}
                </h3>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[var(--vpl-bg-card)] border border-[var(--vpl-border)]">
                  {(['sheer', 'moderate', 'opulent'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIntensity(opt)}
                      aria-pressed={intensity === opt}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        intensity === opt
                          ? 'bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] font-semibold'
                          : 'text-[var(--vpl-text-muted)] hover:text-[var(--vpl-text)]'
                      }`}
                    >
                      {dict.discovery.intensityOptions[opt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Atmosphere & Occasion */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--vpl-text)] mb-3">
                {dict.discovery.step4Title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOOD_VALUES.map((moodValue) => {
                  const active = mood === moodValue;
                  const moodCopy = dict.discovery.moodOptions[moodValue];
                  return (
                    <button
                      key={moodValue}
                      type="button"
                      onClick={() => setMood(moodValue)}
                      aria-pressed={active}
                      className={`p-3.5 rounded-lg border text-start transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--vpl-accent-soft)] border-[var(--vpl-accent)]'
                          : 'bg-[var(--vpl-bg-card)] border-[var(--vpl-border)] hover:border-[var(--vpl-border-strong)]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[var(--vpl-text)]">
                        {moodCopy.label}
                      </div>
                      <div className="text-xs text-[var(--vpl-text-muted)] mt-0.5">
                        {moodCopy.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Scent Identity Profile Card */}
          <div className="lg:col-span-5 rounded-xl bg-[var(--vpl-bg-card)] border border-[var(--vpl-border-gold)] overflow-hidden">
            <div className="h-44 relative bg-[#1A1612]">
              {!botanicalImgError ? (
                <img
                  src="/src/assets/images/botanical_essences_flatlay_1795443173180.jpg"
                  alt={dict.discovery.botanicalImgAlt}
                  referrerPolicy="no-referrer"
                  onError={() => setBotanicalImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#231C15] to-[#120F0C]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#13110F] via-[#13110F]/55 to-transparent" />
              <div className="absolute bottom-4 start-5 end-5">
                <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
                  {dict.discovery.profileCardEyebrow}
                </p>
                <h3 className="font-serif text-2xl font-semibold text-[#F4EFE6] mt-0.5">
                  {profileCopy.label}
                </h3>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <p className="text-sm text-[var(--vpl-text-body)] leading-relaxed">
                {profileCopy.summary}
              </p>

              <div className="pt-4 border-t border-[var(--vpl-border)]">
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--vpl-text-muted)] mb-3">
                  {dict.discovery.recommendedPalette}
                </div>
                <div className="space-y-2.5">
                  {recommendedNotes.map((note) => {
                    const noteCopy = getNoteCopy(note);
                    return (
                      <div
                        key={note.id}
                        className="flex items-center justify-between text-sm py-1 border-b border-[var(--vpl-border-subtle)] last:border-b-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: note.colorHex }}
                            aria-hidden="true"
                          />
                          <span className="text-[var(--vpl-text)] font-medium truncate">
                            {noteCopy.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[var(--vpl-text-muted)] uppercase shrink-0 ms-3">
                          {getLayerLabel(note.layer)} · {getFamilyLabel(note.family)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleApplyAndEnter}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[var(--vpl-accent)] text-[var(--vpl-accent-text-on-fill)] text-sm font-semibold hover:bg-[var(--vpl-accent-hover)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>{dict.discovery.applyProfileCta}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onEnterLabDirect}
                  className="px-4 py-3 rounded-lg border border-[var(--vpl-border-strong)] text-[var(--vpl-text-secondary)] text-sm font-medium hover:border-[var(--vpl-accent)] hover:text-[var(--vpl-text)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {dict.discovery.startEmptyCta}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

