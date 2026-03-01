"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparks,
  MapPin,
  Xmark,
  WarningTriangle,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { AsyncTagInput } from "./async-tag-input";

/**
 * An interest is "unresolved" when its id === name (string fallback).
 * Real Meta interests always have a numeric id like "6003107902433".
 * Unresolved interests are shown in the UI but will be silently rejected
 * by Meta at campaign launch — the user should know.
 */
function isUnresolvedId(id: string): boolean {
  return isNaN(Number(id));
}

export function AudienceSummaryPanel() {
  const {
    setStep,
    updateDraft,
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    locations,
  } = useCampaignStore();

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
      country: loc.country_name || loc.country,
    };
    if (!locations.some((l: any) => l.id === newLoc.id)) {
      updateDraft({ locations: [...locations, newLoc] });
    }
  };

  const unresolvedCount = targetInterests.filter((i: any) =>
    isUnresolvedId(i.id),
  ).length;

  return (
    <div className="space-y-5 flex-1 overflow-y-auto pr-1 no-scrollbar pb-4">
      {/* Demographics */}
      <div className="p-4 bg-muted/20 rounded-2xl border border-border space-y-4">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Demographics
        </label>
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Age Range</span>
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
              className="h-9 w-20 text-center bg-background rounded-xl border-border"
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
              className="h-9 w-20 text-center bg-background rounded-xl border-border"
            />
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Gender</span>
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
      </div>

      {/* Locations */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Target Locations
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="w-full pt-1">
            <AsyncTagInput
              placeholder="Add city..."
              searchType="location"
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
                {loc.name}
                <button
                  onClick={() => removeLocation(loc)}
                  className="hover:bg-muted rounded-full p-0.5 ml-1"
                >
                  <Xmark className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No locations yet
            </p>
          )}
        </div>
      </div>

      {/* Behaviors */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparks className="h-3.5 w-3.5 text-purple-500" /> Behaviors
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="w-full pt-1">
            <AsyncTagInput
              placeholder="Add behavior..."
              searchType="behavior"
              onAdd={(val) => {
                if (!targetBehaviors?.some((b: any) => b.id === val.id)) {
                  updateDraft({
                    targetBehaviors: [...(targetBehaviors || []), val],
                  });
                }
              }}
            />
          </div>
          {targetBehaviors?.length > 0 ? (
            targetBehaviors.map((beh: any) => (
              <Badge
                key={beh.id}
                variant="secondary"
                className="bg-purple-500/10 text-purple-600 border border-purple-200 hover:bg-purple-500/20 py-1 px-3 rounded-full cursor-pointer"
                onClick={() =>
                  updateDraft({
                    targetBehaviors: targetBehaviors.filter(
                      (b: any) => b.id !== beh.id,
                    ),
                  })
                }
              >
                {beh.name} <Xmark className="h-3 w-3 ml-1 opacity-50" />
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No behaviors yet
            </p>
          )}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Interests</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="w-full pt-1">
            <AsyncTagInput
              placeholder="Add interest..."
              searchType="interest"
              onAdd={addInterest}
            />
          </div>
          {targetInterests.filter((int: any) => !isUnresolvedId(int.id))
            .length > 0 ? (
            targetInterests
              .filter((int: any) => !isUnresolvedId(int.id))
              .map((int: any) => {
                return (
                  <Badge
                    key={int.id}
                    variant="secondary"
                    title={`Meta ID: ${int.id}`}
                    className={cn(
                      "py-1 px-3 rounded-full cursor-pointer transition-colors bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                    onClick={() => removeInterest(int)}
                  >
                    {int.name}
                    <Xmark className="h-3 w-3 ml-1 opacity-50" />
                  </Badge>
                );
              })
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No interests yet
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <Button
          onClick={() => setStep(3)}
          disabled={targetInterests.length === 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-soft"
        >
          Confirm Audience <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
