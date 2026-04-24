"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparks, MapPin, Xmark, WarningTriangle, Suitcase, NavArrowDown } from "iconoir-react";
import { cn } from "@/lib/utils";
import { AsyncTagInput } from "./async-tag-input";
import { CITY_TARGETING_UNSUPPORTED } from "@/lib/constants/geo-targeting";
import { useState, useEffect } from "react";


/** Real Meta IDs are always numeric strings (e.g. "6003107902433"). */
function isResolvedId(id: string): boolean {
  return !isNaN(Number(id));
}

/** Skeleton placeholders shown while Phase 2 targeting resolution is in progress. */
function TargetingSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {[40, 64, 52].map((w, i) => (
        <div
          key={i}
          className="h-5 rounded-full bg-muted-foreground/50 animate-pulse"
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
}

export function AudienceSummaryPanel() {
  const {
    setStep,
    updateDraft,
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    targetLanguages,
    exclusionAudienceIds,
    targetLifeEvents,
    targetWorkPositions,
    targetIndustries,
    locations,
    isResolvingTargeting,
    targetingResolutionError,
  } = useCampaignStore();

  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [locationSearchType, setLocationSearchType] = useState<"country" | "region" | "city">("region");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Count of AI-managed advanced targeting items
  const advancedCount =
    (targetBehaviors?.length ?? 0) +
    (targetWorkPositions?.length ?? 0) +
    (targetIndustries?.length ?? 0) +
    (targetLifeEvents?.length ?? 0);

  // Fetch interest suggestions when 2+ interests are selected
  useEffect(() => {
    if (targetInterests.length < 2) {
      setSuggestions([]);
      return;
    }
    const delay = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const names = targetInterests
          .filter((i: any) => isResolvedId(i.id))
          .map((i: any) => i.name)
          .join(",");
        if (!names) return;
        const res = await fetch(
          `/api/meta/suggest-interests?interests=${encodeURIComponent(names)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const results: Array<{ id: string; name: string }> = Array.isArray(data)
          ? data
          : data?.data ?? [];
        // Filter out already-selected interests
        const selectedIds = new Set(targetInterests.map((i: any) => String(i.id)));
        setSuggestions(results.filter((s) => !selectedIds.has(String(s.id))).slice(0, 5));
      } catch {
        // silent
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [targetInterests.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeInterest = (interest: any) => {
    updateDraft({
      targetInterests: targetInterests.filter(
        (i: any) => i.id !== interest.id && i.name !== interest.name,
      ),
    });
  };

  const addInterest = (interest: any) => {
    if (!targetInterests.some((i: any) => i.id === interest.id)) {
      updateDraft({ targetInterests: [...targetInterests, interest] });
    }
  };

  const removeLocation = (loc: any) => {
    const id = loc.id || loc.key;
    updateDraft({
      locations: locations.filter((l: any) => l.id !== id && l.key !== id),
    });
  };

  const addLocation = (loc: any) => {
    const newLoc = {
      id: loc.key || loc.id,
      name: loc.name,
      type: loc.type,
      // For country-type results, the location itself is the country
      country: loc.type === "country" ? loc.name : (loc.country_name || loc.country),
    };
    if (!locations.some((l: any) => l.id === newLoc.id)) {
      updateDraft({ locations: [...locations, newLoc] });
    }
  };

  return (
    <div className="space-y-5 flex-1 overflow-y-auto pr-1 no-scrollbar pb-4">
      {/* Demographics */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Demographics
        </label>
        <div className="space-y-2">
          <span className="text-xs text-subtle-foreground">Age Range</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={18}
              max={65}
              value={ageRange?.min ?? 18}
              onChange={(e) =>
                updateDraft({
                  ageRange: {
                    min: parseInt(e.target.value) || 18,
                    max: ageRange?.max ?? 65,
                  },
                })
              }
              className="h-9 w-20 text-center bg-background rounded-md border-border"
            />
            <div className="h-px bg-border flex-1" />
            <Input
              type="number"
              min={18}
              max={65}
              value={ageRange?.max ?? 65}
              onChange={(e) =>
                updateDraft({
                  ageRange: {
                    min: ageRange?.min ?? 18,
                    max: parseInt(e.target.value) || 65,
                  },
                })
              }
              className="h-9 w-20 text-center bg-background rounded-md border-border"
            />
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs text-subtle-foreground">Gender</span>
          <div className="grid grid-cols-3 gap-2">
            {(["all", "male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => updateDraft({ gender: g })}
                className={cn(
                  "h-8 text-xs font-medium rounded-lg border transition-all capitalize",
                  gender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Languages (Phase 1A) */}
        <div className="space-y-2">
          <span className="text-xs text-subtle-foreground flex items-center justify-between">
            <span>Language</span>
            {targetLanguages?.length > 0 && (
              <button
                onClick={() => updateDraft({ targetLanguages: [] })}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 6, label: "English" },
              { id: 114, label: "Yoruba" },
              { id: 66, label: "Igbo" },
              { id: 35, label: "Hausa" },
            ].map((lang) => {
              const isSelected = targetLanguages?.includes(lang.id);
              return (
                <Badge
                  key={lang.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-colors border-border px-3 py-1 text-xs",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:border-primary/50",
                  )}
                  onClick={() => {
                    const current = targetLanguages || [];
                    const next = isSelected
                      ? current.filter((id) => id !== lang.id)
                      : [...current, lang.id];
                    updateDraft({ targetLanguages: next });
                  }}
                >
                  {lang.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Exclusions Stub (Phase 1C) */}
        {/* Full custom audience UI will go in Phase 2, but we need the field ready */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="rounded border-border text-primary focus:ring-primary/20 bg-background"
              checked={exclusionAudienceIds?.length > 0}
              onChange={(e) => {
                // For now, this just toggles a dummy state to prove the data flow works before Phase 2 adds real Meta Audiences
                updateDraft({
                  exclusionAudienceIds: e.target.checked
                    ? ["dummy_exclusion_id_phase1"]
                    : [],
                });
              }}
            />
            <span className="text-xs text-subtle-foreground group-hover:text-foreground transition-colors">
              Exclude previous customers
              <span className="text-xs text-subtle-foreground ml-1">
                (Coming soon)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Target Locations
        </label>
        <div className="flex flex-wrap gap-2">
          {/* Location granularity selector */}
          <div className="w-full grid grid-cols-3 gap-1.5">
            {(["country", "region", "city"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLocationSearchType(t)}
                className={cn(
                  "h-7 text-xs font-medium rounded-md border transition-all capitalize",
                  locationSearchType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {t === "region" ? "State/Region" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="w-full">
            <AsyncTagInput
              placeholder={
                locationSearchType === "country"
                  ? "Search country..."
                  : locationSearchType === "region"
                    ? "Search state or region..."
                    : "Search city..."
              }
              searchType="location"
              searchParams={{ type: locationSearchType }}
              onAdd={addLocation}
            />
          </div>
          {locations.length > 0 ? (
            locations.map((loc: any) => (
              <Badge
                key={loc.id}
                variant="outline"
                className="border-border bg-background text-foreground py-1.5 pl-3 pr-1 gap-2 rounded-full"
              >
                <MapPin className="h-3 w-3 text-primary" />
                <span>
                  {loc.name}
                  <span className="text-xs text-subtle-foreground ml-1 capitalize">({loc.type})</span>
                </span>
                <button
                  onClick={() => removeLocation(loc)}
                  className="hover:bg-muted rounded-full p-0.5 ml-1"
                >
                  <Xmark className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-sm text-subtle-foreground italic">
              No locations yet
            </p>
          )}
          {locationSearchType === "city" && locations.some(
            (l: any) =>
              l.type === "city" &&
              l.country &&
              l.country in CITY_TARGETING_UNSUPPORTED,
          ) && (
            <p className="w-full text-xs text-status-warning flex items-center gap-1 mt-0.5">
              <WarningTriangle className="w-3 h-3 shrink-0" />
              City targeting isn't available in Nigeria — your ad will reach all of Nigeria. Use State/Region and search "Lagos State" or "Anambra State" instead.
            </p>
          )}
        </div>
      </div>

      {/* Advanced Targeting — collapsed by default, AI-managed */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Accordion trigger */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2">
            <Sparks className="h-3.5 w-3.5 text-ai shrink-0" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              AI Targeting
            </span>
            {advancedCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-ai/10 text-ai">
                {advancedCount} selected
              </span>
            ) : (
              <span className="text-xs text-subtle-foreground font-normal normal-case tracking-normal">
                Behaviours, roles &amp; life stages
              </span>
            )}
          </span>
          <NavArrowDown
            className={cn(
              "h-4 w-4 text-subtle-foreground transition-transform duration-200 shrink-0",
              advancedOpen && "rotate-180",
            )}
          />
        </button>

        {/* Accordion body — grid trick for smooth animation */}
        <div
          className="grid transition-all duration-200 ease-out"
          style={{ gridTemplateRows: advancedOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 space-y-5 border-t border-border">

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparks className="h-3 w-3 text-ai" /> Behaviours
                  </p>
                  <p className="text-xs text-subtle-foreground font-normal">
                    Shopping habits Meta detects from user activity — e.g. frequent online buyers
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="w-full">
                    <AsyncTagInput
                      placeholder="Add behaviour..."
                      searchType="behavior"
                      onAdd={(val) => {
                        if (!targetBehaviors?.some((b: any) => b.id === val.id)) {
                          updateDraft({ targetBehaviors: [...(targetBehaviors || []), val] });
                        }
                      }}
                    />
                  </div>
                  {isResolvingTargeting ? (
                    <TargetingSkeleton />
                  ) : targetBehaviors?.length > 0 ? (
                    targetBehaviors.map((beh: any) => (
                      <Badge
                        key={beh.id}
                        variant="secondary"
                        className={cn(
                          "py-1 px-3 rounded-full cursor-pointer border transition-colors",
                          isResolvedId(beh.id)
                            ? "bg-ai/10 text-ai border-ai/20 hover:bg-ai/20"
                            : "bg-status-warning-soft text-status-warning border-status-warning/30 hover:bg-status-warning-soft/80",
                        )}
                        onClick={() => updateDraft({ targetBehaviors: targetBehaviors.filter((b: any) => b.id !== beh.id) })}
                      >
                        {!isResolvedId(beh.id) && <WarningTriangle className="h-3 w-3 mr-1 opacity-70" />}
                        {beh.name} <Xmark className="h-3 w-3 ml-1 opacity-50" />
                      </Badge>
                    ))
                  ) : targetingResolutionError ? (
                    <p className="text-xs text-status-warning italic">Couldn't load — add manually</p>
                  ) : (
                    <p className="text-xs text-subtle-foreground italic">None yet — AI will suggest</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Suitcase className="h-3 w-3 text-ai" /> Job Titles
                  </p>
                  <p className="text-xs text-subtle-foreground font-normal">
                    Reach people by what they do for work — e.g. salon owners, boutique sellers
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="w-full">
                    <AsyncTagInput
                      placeholder="Add job title..."
                      searchType="work-position"
                      onAdd={(val) => {
                        if (!targetWorkPositions?.some((p: any) => p.id === val.id)) {
                          updateDraft({ targetWorkPositions: [...(targetWorkPositions || []), val] });
                        }
                      }}
                    />
                  </div>
                  {isResolvingTargeting ? (
                    <TargetingSkeleton />
                  ) : targetWorkPositions?.length > 0 ? (
                    targetWorkPositions.map((pos: any) => (
                      <Badge
                        key={pos.id}
                        variant="secondary"
                        className={cn(
                          "py-1 px-3 rounded-full cursor-pointer border transition-colors",
                          isResolvedId(pos.id)
                            ? "bg-ai/10 text-ai border-ai/20 hover:bg-ai/20"
                            : "bg-status-warning-soft text-status-warning border-status-warning/30 hover:bg-status-warning-soft/80",
                        )}
                        onClick={() => updateDraft({ targetWorkPositions: targetWorkPositions.filter((p: any) => p.id !== pos.id) })}
                      >
                        {!isResolvedId(pos.id) && <WarningTriangle className="h-3 w-3 mr-1 opacity-70" />}
                        {pos.name} <Xmark className="h-3 w-3 ml-1 opacity-50" />
                      </Badge>
                    ))
                  ) : targetingResolutionError ? (
                    <p className="text-xs text-status-warning italic">Couldn't load — add manually</p>
                  ) : (
                    <p className="text-xs text-subtle-foreground italic">None yet — AI will suggest</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Suitcase className="h-3 w-3 text-ai" /> Industries
                  </p>
                  <p className="text-xs text-subtle-foreground font-normal">
                    Target by business sector — e.g. fashion retail, beauty, food &amp; beverage
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="w-full">
                    <AsyncTagInput
                      placeholder="Add industry sector..."
                      searchType="industry"
                      onAdd={(val) => {
                        if (!targetIndustries?.some((i: any) => i.id === val.id)) {
                          updateDraft({ targetIndustries: [...(targetIndustries || []), val] });
                        }
                      }}
                    />
                  </div>
                  {isResolvingTargeting ? (
                    <TargetingSkeleton />
                  ) : targetIndustries?.length > 0 ? (
                    targetIndustries.map((industry: any) => (
                      <Badge
                        key={industry.id}
                        variant="secondary"
                        className={cn(
                          "py-1 px-3 rounded-full cursor-pointer border transition-colors",
                          isResolvedId(industry.id)
                            ? "bg-ai/10 text-ai border-ai/20 hover:bg-ai/20"
                            : "bg-status-warning-soft text-status-warning border-status-warning/30 hover:bg-status-warning-soft/80",
                        )}
                        onClick={() => updateDraft({ targetIndustries: targetIndustries.filter((i: any) => i.id !== industry.id) })}
                      >
                        {!isResolvedId(industry.id) && <WarningTriangle className="h-3 w-3 mr-1 opacity-70" />}
                        {industry.name} <Xmark className="h-3 w-3 ml-1 opacity-50" />
                      </Badge>
                    ))
                  ) : targetingResolutionError ? (
                    <p className="text-xs text-status-warning italic">Couldn't load — add manually</p>
                  ) : (
                    <p className="text-xs text-subtle-foreground italic">None yet — AI will suggest</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparks className="h-3 w-3 text-ai" /> Life Events
                  </p>
                  <p className="text-xs text-subtle-foreground font-normal">
                    Reach people at key moments — new baby, just moved, newly engaged
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="w-full">
                    <AsyncTagInput
                      placeholder="Add life event..."
                      searchType="life-events"
                      onAdd={(val) => {
                        if (!targetLifeEvents?.some((e: any) => e.id === val.id)) {
                          updateDraft({ targetLifeEvents: [...(targetLifeEvents || []), val] });
                        }
                      }}
                    />
                  </div>
                  {isResolvingTargeting ? (
                    <TargetingSkeleton />
                  ) : targetLifeEvents?.length > 0 ? (
                    targetLifeEvents.map((event: any) => (
                      <Badge
                        key={event.id}
                        variant="secondary"
                        className={cn(
                          "py-1 px-3 rounded-full cursor-pointer border transition-colors",
                          isResolvedId(event.id)
                            ? "bg-ai/10 text-ai border-ai/20 hover:bg-ai/20"
                            : "bg-status-warning-soft text-status-warning border-status-warning/30 hover:bg-status-warning-soft/80",
                        )}
                        onClick={() => updateDraft({ targetLifeEvents: targetLifeEvents.filter((e: any) => e.id !== event.id) })}
                      >
                        {!isResolvedId(event.id) && <WarningTriangle className="h-3 w-3 mr-1 opacity-70" />}
                        {event.name} <Xmark className="h-3 w-3 ml-1 opacity-50" />
                      </Badge>
                    ))
                  ) : targetingResolutionError ? (
                    <p className="text-xs text-status-warning italic">Couldn't load — add manually</p>
                  ) : (
                    <p className="text-xs text-subtle-foreground italic">None yet — AI will suggest</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Interests
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="w-full pt-1">
            <AsyncTagInput
              placeholder="Add interest..."
              searchType="interest"
              onAdd={addInterest}
            />
          </div>
          {isResolvingTargeting ? (
            <TargetingSkeleton />
          ) : targetInterests.length > 0 ? (
            targetInterests.map((int: any) => (
                <Badge
                  key={int.id}
                  variant="secondary"
                  className={cn(
                    "py-1 px-3 rounded-full cursor-pointer transition-colors",
                    isResolvedId(int.id)
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-status-warning-soft text-status-warning border border-status-warning/30 hover:bg-status-warning-soft/80",
                  )}
                  onClick={() => removeInterest(int)}
                >
                  {!isResolvedId(int.id) && <WarningTriangle className="h-3 w-3 mr-1 opacity-70" />}
                  {int.name}
                  <Xmark className="h-3 w-3 ml-1 opacity-50" />
                </Badge>
              ))
          ) : targetingResolutionError ? (
            <p className="text-xs text-status-warning italic">Couldn't load — add interests manually above</p>
          ) : (
            <p className="text-sm text-subtle-foreground italic">
              No interests yet
            </p>
          )}
        </div>

        {/* Interest suggestions */}
        {(suggestions.length > 0 || loadingSuggestions) && (
          <div className="pt-1 space-y-1.5">
            <p className="text-xs text-subtle-foreground uppercase tracking-wider font-medium">
              Related interests
            </p>
            {loadingSuggestions ? (
              <p className="text-xs text-subtle-foreground italic">Finding related interests...</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addInterest(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <Button
          onClick={() => setStep(3)}
          disabled={targetInterests.length === 0 || isResolvingTargeting}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg border border-border"
        >
          {isResolvingTargeting ? "Finding best audience..." : "Confirm Audience"}
          {!isResolvingTargeting && <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
