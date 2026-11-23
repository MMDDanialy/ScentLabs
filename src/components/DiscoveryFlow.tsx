import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { ATELIER_PRESETS, FRAGRANCE_NOTES, OLFACTORY_FAMILIES } from '../data/catalog';
import { buildScentProfile } from '../engine/formulationEngine';
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
  onApplyProfileAndEnter: (profile: ScentProfile, starterBlend: BlendSelection) => void;
  onEnterLabDirect: () => void;
  onLoadPreset: (preset: AtelierPreset) => void;
}

const MOOD_OPTIONS: { value: AtelierMood; subtitle: string }[] = [
  { value: 'Daylight Atelier', subtitle: 'Crisp clarity, linen, morning citrus' },
  { value: 'Evening Noir', subtitle: 'Resinous shadows, warm spice, amber' },
  { value: 'Botanical Solitude', subtitle: 'Herbal air, dry root, quiet wood' },
  { value: 'Velvet Ceremony', subtitle: 'Opulent petals, incense, deep musk' },
];

export const DiscoveryFlow: React.FC<DiscoveryFlowProps> = ({
  onApplyProfileAndEnter,
  onEnterLabDirect,
  onLoadPreset,
}) => {
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
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-8 sm:pt-12 pb-14 border-b border-[#D4AF6E]/15 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between py-2">
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-[#D4AF6E] mb-4">
              Digital Perfumery Atelier · Precision Formulation
            </p>
            <h1
              className="font-serif text-[clamp(2.4rem,4.4vw,4rem)] font-semibold leading-[1.06] tracking-tight text-[#F4EFE6] mb-6"
              style={{ textWrap: 'balance' }}
            >
              Compose bespoke fragrance accords with laboratory clarity.
            </h1>
            <p className="text-base sm:text-[17px] leading-relaxed text-[#B9B0A2] max-w-[58ch] mb-8">
              Explore 27 botanical and molecular materials across Top, Heart, and Base tiers.
              Inspect normalized virtual blend shares, balance pyramid architecture in real time,
              and mint a collectible Fragrance Identity Passport.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onEnterLabDirect}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#D4AF6E] text-[#0A0908] text-sm font-semibold hover:bg-[#E0BE82] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF6E] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Enter the Laboratory</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#scent-discovery"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#D4AF6E]/30 text-[#F4EFE6] text-sm font-medium hover:border-[#D4AF6E]/70 hover:bg-[#161412] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF6E] whitespace-nowrap shrink-0"
              >
                <span>Build Scent Profile</span>
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-6">
            <div>
              <div className="font-mono text-2xl font-semibold text-[#F4EFE6] tabular-nums">27</div>
              <div className="text-xs text-[#9C9283] mt-1">Curated raw notes</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-[#F4EFE6] tabular-nums">3 Tiers</div>
              <div className="text-xs text-[#9C9283] mt-1">Top · Heart · Base</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold text-[#F4EFE6] tabular-nums">10</div>
              <div className="text-xs text-[#9C9283] mt-1">Reference profiles</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-[#D4AF6E]/20 bg-[#141210] min-h-[320px] lg:min-h-[460px]">
          {!heroImgError ? (
            <img
              src="/src/assets/images/atelier_hero_flask_1795443175826.jpg"
              alt="Perfumery atelier workbench with amber glass apothecary flacons, brass pipettes, and raw botanicals"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full object-cover lg:h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#1C1712] to-[#0D0B09]">
              <Sparkles className="w-8 h-8 text-[#D4AF6E] mb-3" aria-hidden="true" />
              <p className="font-serif text-xl text-[#F4EFE6]">Atelier Workbench</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908]/85 via-[#0A0908]/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
            <p className="text-xs font-mono text-[#E5DDD0] tracking-wide">
              Virtual formulation workspace · Non-physical creative ratios
            </p>
          </div>
        </div>
      </section>

      {/* Curated Starter Accords */}
      <section className="py-10 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
              Immediate Exploration
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#F4EFE6] mt-1">
              Starter Atelier Accords
            </h2>
          </div>
          <p className="text-sm text-[#9C9283]">
            Load a curated benchmark directly into the blending vessel or customize below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ATELIER_PRESETS.map((preset) => {
            const totalUnits = Object.values(preset.selection).reduce((s, v) => s + v, 0);
            const noteNames = Object.keys(preset.selection)
              .slice(0, 3)
              .map((id) => FRAGRANCE_NOTES.find((n) => n.id === id)?.name.split(' ').pop())
              .filter(Boolean)
              .join(' · ');

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onLoadPreset(preset)}
                className="group text-left p-5 rounded-xl bg-[#13110F] border border-white/10 hover:border-[#D4AF6E]/55 hover:bg-[#191613] transition-all focus-visible:outline-2 focus-visible:outline-[#D4AF6E] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-[#A89F91] mb-2 tabular-nums">
                    {Object.keys(preset.selection).length} notes · {totalUnits} drops
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#F4EFE6] group-hover:text-[#D4AF6E] transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-sm text-[#A89F91] mt-1.5 leading-relaxed">
                    {preset.subtitle}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between text-xs text-[#D4AF6E]">
                  <span className="truncate">{noteNames}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2" aria-hidden="true" />
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
            <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
              Stage 01 · Scent Identity Discovery
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#F4EFE6] mt-1">
              Calibrate your olfactory direction
            </h2>
          </div>
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A89F91] hover:text-[#F4EFE6] transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset preferences</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Preference Cards */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Olfactory Families */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F4EFE6]">
                  1. Preferred Olfactory Families
                </h3>
                <span className="text-xs font-mono text-[#9C9283] tabular-nums">
                  {selectedFamilies.length}/3 selected
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
                      className={`px-3.5 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[#D4AF6E]/15 border-[#D4AF6E] text-[#F4EFE6]'
                          : 'bg-[#13110F] border-white/10 text-[#A89F91] hover:border-white/25 hover:text-[#F4EFE6]'
                      }`}
                    >
                      <span className="truncate">{family}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#D4AF6E] shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Thermal Balance & Intensity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-[#F4EFE6] mb-3">
                  2. Thermal Direction
                </h3>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#13110F] border border-white/10">
                  {(
                    [
                      { id: 'fresh', label: 'Fresh' },
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'warm', label: 'Warm' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTemperature(opt.id)}
                      aria-pressed={temperature === opt.id}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        temperature === opt.id
                          ? 'bg-[#D4AF6E] text-[#0A0908] font-semibold'
                          : 'text-[#A89F91] hover:text-[#F4EFE6]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#F4EFE6] mb-3">
                  3. Structural Presence
                </h3>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#13110F] border border-white/10">
                  {(
                    [
                      { id: 'sheer', label: 'Sheer' },
                      { id: 'moderate', label: 'Moderate' },
                      { id: 'opulent', label: 'Opulent' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIntensity(opt.id)}
                      aria-pressed={intensity === opt.id}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        intensity === opt.id
                          ? 'bg-[#D4AF6E] text-[#0A0908] font-semibold'
                          : 'text-[#A89F91] hover:text-[#F4EFE6]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Atmosphere & Occasion */}
            <div>
              <h3 className="text-sm font-semibold text-[#F4EFE6] mb-3">
                4. Atmosphere & Occasion
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOOD_OPTIONS.map((item) => {
                  const active = mood === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMood(item.value)}
                      aria-pressed={active}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D4AF6E]/15 border-[#D4AF6E]'
                          : 'bg-[#13110F] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="text-sm font-medium text-[#F4EFE6]">{item.value}</div>
                      <div className="text-xs text-[#9C9283] mt-0.5">{item.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Live Scent Identity Profile Card */}
          <div className="lg:col-span-5 rounded-xl bg-[#13110F] border border-[#D4AF6E]/25 overflow-hidden">
            <div className="h-44 relative bg-[#1A1612]">
              {!botanicalImgError ? (
                <img
                  src="/src/assets/images/botanical_essences_flatlay_1795443173180.jpg"
                  alt="Raw botanical essences including rose petals, bergamot peel, amber resin, cardamom, and sandalwood curls"
                  referrerPolicy="no-referrer"
                  onError={() => setBotanicalImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#231C15] to-[#120F0C]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#13110F] via-[#13110F]/45 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-xs font-mono uppercase tracking-wider text-[#D4AF6E]">
                  Your Scent Identity Profile
                </p>
                <h3 className="font-serif text-2xl font-semibold text-[#F4EFE6] mt-0.5">
                  {profile.label}
                </h3>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <p className="text-sm text-[#C7BEB0] leading-relaxed">{profile.summary}</p>

              <div className="pt-4 border-t border-white/10">
                <div className="text-xs font-mono uppercase tracking-wider text-[#9C9283] mb-3">
                  Recommended Palette
                </div>
                <div className="space-y-2.5">
                  {recommendedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: note.colorHex }}
                          aria-hidden="true"
                        />
                        <span className="text-[#F4EFE6] font-medium truncate">{note.name}</span>
                      </div>
                      <span className="text-xs font-mono text-[#A89F91] uppercase shrink-0 ml-3">
                        {note.layer} · {note.family}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleApplyAndEnter}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D4AF6E] text-[#0A0908] text-sm font-semibold hover:bg-[#E0BE82] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Apply Profile & Enter Lab</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onEnterLabDirect}
                  className="px-4 py-3 rounded-lg border border-white/15 text-[#E5DDD0] text-sm font-medium hover:border-[#D4AF6E]/50 hover:text-[#F4EFE6] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Start Empty
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
