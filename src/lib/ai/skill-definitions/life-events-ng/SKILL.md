---
name: life-events-ng
version: "2.0.0"
description: Load only when preprocessor detected life signal (<life> tag present) OR business type is bridal/baby/home/corporate wear.
---

# Life Events Targeting (Nigeria)

Max 2. Return [] if not applicable. Goes in lifeEvents[], NOT behaviors[].
If <life> tag present in input, confirm and expand from those signals + full prompt context.
⚠️ Not exhaustive — scan prompt for life transitions (wedding, baby, job, home, graduation, send-forth)

## Layer 1 — Explicit audience signals (highest priority)

| Says                                                                      | Event                     |
| ------------------------------------------------------------------------- | ------------------------- |
| targeting brides / engaged women / she do introduction                    | Newly engaged (1 year)    |
| pregnant / maternity / expecting / baby shower                            | Expecting parents         |
| new moms / new parents / naming ceremony / mama wey just born             | New parents (1 year)      |
| just moved / housewarming / new apartment / dem just pack in              | Recently moved (6 months) |
| first home buyers / new homeowner                                         | New homeowner (1 year)    |
| new job / fresh graduate / NYSC / corper / send-forth / graduation agbada | New job (6 months)        |
| newlyweds / honeymoon / couple wey just wed                               | Newly married (1 year)    |

## Layer 2 — Occasion keywords

bridal shower/bachelorette→Newly engaged | baby naming→New parents | housewarming→New homeowner
engagement/introduction party→Newly engaged | send-forth/farewell→New job | newlywed gift→Newly married
push present/maternity gift→Expecting parents

## Layer 3 — Product inference (use when no explicit signal)

| Product                                                               | Event                                    | Confidence |
| --------------------------------------------------------------------- | ---------------------------------------- | ---------- |
| wedding gown,bridal accessories,asoebi,wedding cake/photo/decor       | Newly engaged (1 year)                   | Strong     |
| baby clothes,diapers,prams,cribs                                      | Expecting parents + New parents (1 year) | Strong     |
| maternity wear,nursing products                                       | Expecting parents                        | Strong     |
| home furniture,sofas,beds,interior design,curtains,kitchen appliances | New homeowner (1 year)                   | Strong     |
| moving/relocation services                                            | Recently moved (6 months)                | Strong     |
| corporate wear,suits,office shirts                                    | New job (6 months)                       | Strong     |
| office shoes,professional bags,laptop bags                            | New job (6 months)                       | Medium     |
| couple accessories,matching outfits                                   | Newly married (1 year)                   | Medium     |
| jewellery (engagement rings,bridal)                                   | Newly engaged (1 year)                   | Strong     |
| Medium = include only if copy angle supports it                       | Weak = skip                              |

## Never include for

food,generic fashion,wigs(general),electronics,logistics,gaming,general catering

## Output format

`"lifeEvents": ["Newly engaged (1 year)"]` — exact Meta name spelling
Always log triggered event in meta.inferred_assumptions
