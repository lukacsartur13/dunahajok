# PXL — PHASE 4.7.1

**The upholstery footprint, traced rather than interpreted.**

Phase 4.7's topology was right and its extent was wrong. This phase does not
refine those cushions; it deletes their plan and rebuilds it from a measurement
of the delivered cockpit three-quarter. §28 — "Do not interpret the upholstery
anymore. TRACE IT."

| | |
|---|---|
| Model | `assets/derived/pxl/PXL.production.glb` → `public/models/PXL.glb` |
| Faces | 59,045 authored · 32,397 delivered · 0.53 MB transfer |
| Forward padding | **x 0.000 → 2.050**, meeting at x 1.435, 16 mm seam, 1.918 m² a side |
| Was | x −0.780 → 2.100, meeting at x 1.956, 2.549 m² a side |
| Checks | `npm run qa` — 2,147 state · 153 vessel · model validation · topology, green |
| Visual | 7 of 7 regression cases pass |
| Footprint | `npm run upholstery:trace` — **IoU 57.6%**, area ratio 0.900, against 4.7's 37.8% and 1.368 |
| Sheets | `.qa/PHASE_4_7_1_comparison.png` (5 rows) · `.qa/p471-mask.png` · `.qa/p471-debug-*.png` |

---

## A. The measurement, and why there had not been one

Every station in Phases 4.6 and 4.7 came out of looking at a crop and saying
where something appeared to start. §7 rules the method out before it rules out
any particular answer: "Do not invent the plan shape mathematically… identify
the actual visible brown/cognac cushion footprint."

`scripts/pxl/upholstery-trace.mjs` does that. A pixel in the plate is a ray in
model space, and a ray that meets the cockpit's floor meets it at one point:

1. **Classify.** Cognac by chroma — red over green over blue with real
   separation — because a luminance threshold cannot tell shadowed cognac from
   lit teal deck. 106,161 px.
2. **Open by 7.** The grab rails, the coaming inlay and the two bow cleats are
   the same cognac and are not upholstery. They are 4–9 px across here and the
   cushions are 60–200, so an erosion of 7 removes every one of them. 90,101 px
   survive.
3. **Label.** Three regions above 900 px. The console and the open sole between
   the rear seat and the forward padding separate them without being told to,
   which is itself the answer to §3.
4. **Solve the camera.**
5. **Unproject** through a G-buffer of the model rendered without its cushions,
   so every cognac pixel lands on hard structure the yard delivered and the
   trace does not move when the padding does.

**The floor is lifted by the cushion's own thickness for the G-buffer pass.**
The plate's cognac is the TOP of a cushion and the G-buffer has no cushion, so
a ray carries on past where the padding would be and lands beyond it. At this
elevation that is 0.075 / tan 35° ≈ 0.11 m, all of it in one direction, which
on a 0.35 m cushion is not a rounding error.

---

## B. `reference_top_3q` is a composition, not a solution

The obvious thing was to project through the preset the reference bench already
uses. It is wrong for this job by a wide margin, and it is worth recording
because the preset is not wrong for its own.

```
                        silhouette        aspect
  the plate                1637 × 660      2.48
  the preset, 48° / 34°    1034 × 687      1.50
```

The preset was tuned by eye so that a person comparing the two sees the same
boat at the development slot's proportions. It was never a photogrammetric
solution and nothing in this project previously needed it to be. Measuring
through it put the first run's forward padding at x −1.7 → −0.6, which is under
the driver's feet.

So the camera is **solved**: azimuth, elevation, focal length and principal
point searched for maximum silhouette overlap, over the whole circle of
azimuth, against the plate's boat mask at a luminance threshold of 175.

```
  camera solved   azimuth 18.3°   elevation 34.9°   focal 3725 px at 13.4 m
  silhouette IoU  87.8%
```

**Two failures on the way, both recorded in the file.** The first scored
overlap in PLATE space, which has a degenerate optimum and found it: shrinking
the scale maps the whole plate into a corner of the render, the union collapses
to that corner, and the ratio rises while the two boats separate. It settled at
70% with a silhouette twice the size of the boat under it. Scoring in RENDER
space cannot do that. The second used `right = up × fwd`, which is the mirror of
three's `lookAt` — and because a hull is symmetric port to starboard, a mirrored
render fits the silhouette almost as well. It returned a plausible 80% with the
bow where the transom is; the only symptom was the rear seat tracing to x +1.2.
The azimuth sweep now goes all the way round, so which side the plate is drawn
from is found rather than assumed.

**The figure is excluded from both sides.** The plate draws a helmsman and the
model has none, so every pixel of him scores as a miss and the search answers by
tilting the camera to cover him. The excluded rectangle is drawn in
`p471-trace-plate.png` rather than only documented.

---

## C. What the trace says

Three regions. The console and the open cockpit separate them:

```
  region     px    plate bbox        model x            model y        lands on
       1  55443    997,352→1554,638   0.009.. 2.047   -0.759.. 0.833   cockpit_sole
       2  32682    253,246→ 580,465  -2.580..-1.695   -0.340.. 0.811   transom_black
```

Region 2 is the rear seating, at the bench and backrest the model already has.
Region 1 is the forward padding, and **it starts amidships**. The station
histogram is unambiguous about where: 234 pixels at x −0.10 against 2,134 at
x 0.00.

The resolved side is the far one — the camera stands off the port bow, so the
far padding is seen across the open cockpit while the near padding is behind its
own gunwale for much of its length. §7 asks for exactly that: trace the clearly
visible side, mirror the other.

```
      x    inboard  outboard    width      n
    0.00    0.512    0.833      0.322     2134     ← the aft end
    0.30    0.438    0.833      0.396     2613
    0.50    0.418    0.833      0.416     2644
    0.70    0.402    0.780      0.379     2675     ← the outboard edge leaves the coaming
    0.90    0.361    0.707      0.346     2767
    1.10    0.202    0.631      0.428     2766     ← turning in, and broadening
    1.30    0.032    0.538      0.506     2651
    1.50    0.016    0.368      0.352     1880     ← merged, and narrowing
    1.70    0.008    0.192      0.183      891
    1.80    0.003    0.096      0.092      253
```

**Three things fall out of that table, and each is one of the brief's
complaints.**

* **§4 — the aft end.** x 0.00, not −0.780. Phase 4.7 was 0.78 m too long, which
  is 27% of its own run. That leaves 1.72 m of open dark cockpit between the
  backrest at x −1.72 and the padding, which is §4's "substantial visual gap".
* **§17 — the outboard edge.** It leaves the coaming at x 0.7 and keeps
  leaving: 0.10 m of clearance at x 0.9, 0.39 m at x 1.8. Phase 4.7 held it at
  `coaming − inset` the whole way, which is what filled the bow. The bow now
  RESOLVES instead.
* **§14 — where they broaden.** Width 0.32 at the aft end, 0.42 at x 0.5,
  0.35 at x 0.9, then 0.43 → 0.51 as the two turn in. Broad near the front, not
  from the start.

---

## D. The rebuild

§24: "Do not deform the existing huge cushions into the next version. Delete
them and reconstruct their plan curves cleanly." `forward_pad_plan` is not
adjusted — its whole method changes.

**Phase 4.7 derived everything from a width.** `outboard` was the coaming less
an inset at every station, `inboard` was `outboard − pad_width(x)`, and the
meeting station fell out of the arithmetic at x 1.956. That is three
mathematical inventions of a shape the reference already contains.

**Both edges are now tables**, `pad_inboard` and `pad_outboard`, read off the
trace. The hull's coaming survives as a CLAMP rather than as the definition: a
traced value cannot push the cushion through the topsides, and where the trace
is tighter the trace wins — which is the whole of §17.

```
    forward cushions: 2 x 121 stations  x 0.00..2.05
                      inboard 0.505→0.008   outboard 0.793→0.055
                      width 0.047..0.472    meet x 1.435
```

Two exceptions to "raw trace", both stated in the spec: the stations at x 1.100
and 1.300 read 0.202 and 0.032, and those are the two where the port and
starboard cognac merge in the projection so the percentile is taken over both
sides at once. They are interpolated across; the stations either side are raw.

**`pad_inset` came down from 62 mm to 40 mm**, and that came out of the §9 mask
rather than out of taste: at 62 the live cushion left a band of reference cognac
uncovered along its whole outboard edge, which the comparison draws in red. 40
still leaves a hard-liner band wide enough to read at every camera the
configurator has, so §11's hierarchy survives.

**The base almost disappeared.** The traced inboard edge sits very nearly on the
delivered platform's own step — 0.505 at x 0.0 against a sole edge of about 0.51
— so for most of the run there is nothing to carry: the cushion lies on the
moulding the yard drew. `build_forward_base` skips any station where the lip
would be under 30 mm wide, and what survives is 1,644 faces around x 0.9–1.16
where the sole's forward end is ragged.

---

## E. §8, §9 — the mask, and the number that settles it

The live cushions are drawn through the camera solved in §B, with the boat in
front of them, so a cushion hidden behind a gunwale is hidden here too and the
comparison is of what is VISIBLE rather than of what exists.

| | reference | Phase 4.7 | corrected |
|---|---|---|---|
| projected cognac, px | 55,443 | 75,844 | **49,888** |
| area ratio to the plate | 1.000 | **1.368** | **0.900** |
| bbox left — the aft end | u 997 | u 697 | **u 915** |
| bbox right | u 1554 | u 1579 | u 1556 |
| overlap, IoU | — | **37.8%** | **57.6%** |
| of the reference, covered | — | 65.0% | **69.4%** |
| of the model, landing on it | — | **47.5%** | **77.2%** |

Phase 4.7 painted 37% more cognac than the plate and less than half of it fell
where the plate has any. The corrected version paints 10% less and more than
three quarters of it lands. `.qa/p471-mask.png` and row D of the sheet draw it:
red is reference cognac the model does not cover, blue is model cognac the
reference does not have, white is agreement. Phase 4.7's blue runs a metre
further aft than any red on the plate.

**§19 asked whether there is materially less cognac, and there is**: 1.918 m² a
side against 2.549, a 25% reduction in surface and a larger one in plan, because
what went was mostly the flat top of a 0.78 m run.

---

## F. §26 — the debug view

`npm run upholstery` → `.qa/p471-debug-{top,cockpit3q,bow}.png`. Port RED,
starboard BLUE, rear seating YELLOW, cockpit sole DARK, hard liner LIGHT,
everything else neutral.

The colours are not assigned by side. The forward padding's triangles are
welded by position and walked as a graph, and each CONNECTED COMPONENT gets a
colour — so the picture states a fact rather than restating its own rule. A
third component would draw magenta and fail the build.

```
  piece  side     tris    area          x range          y range          z range
      1  PORT     4930   1.918 m²   0.000.. 2.050   -0.793..-0.008   0.366.. 0.893
      2  STBD     4930   1.918 m²   0.000.. 2.050    0.008.. 0.793    0.366.. 0.893

  MIRROR  area Δ 0.0001 m² · x ends Δ 0.0 mm · z ends Δ 0.0 mm · outboard Δ 0.0 mm
  SEAM    16.0 mm
```

The rear seating is drawn separately because §18 requires it to BE separate: it
is 1,024 triangles abaft x −0.90 with 1.72 m of dark floor between it and the
nearest forward cushion, and nothing joins them.

---

## G. Unchanged

The interior material work from 4.7 stands and is what makes the plan read:
every up-facing interior surface below z 0.62 is `cockpit_sole` at a delivery
base of 0.010 linear, the forward liner's flat is separated out of its own shell
into the same zone, and `interior_hard_liner` is coaming and only coaming. §10,
§11 and §12 are met by that work rather than by this one. The configurator rule
§23 asks for has held since Phase 4.3 and is asserted from both ends by
`npm test`: the interior colour reaches `upholstery_primary` and nothing else.

---

## H. Remaining mismatches

1. **The near-side cushion is visible in the model and not in the plate.** It is
   the largest single block of blue in the mask and most of the 22.8% of the
   model that does not land on the reference. Either the plate's near padding is
   behind its own gunwale at an elevation slightly lower than the solve found,
   or the reference is genuinely asymmetric there. §6 and §14 require the
   mirror, so the model is symmetric and this is left as a named residual rather
   than resolved by building one side short.
2. **69.4% of the reference is covered, not 90%.** The uncovered 30% is mostly a
   band along the far cushion's outboard edge, where the plate runs the cognac
   closer to the coaming than 40 mm of inset allows. Closing it further would
   spend §11's visible hard liner to buy image-space overlap, which is the wrong
   trade.
3. **The meeting station is a consequence and is not directly measured.**
   x 1.435 falls out of the two traced tables. The trace's own inboard edge
   reaches the centreline between x 1.30 and 1.40, so the two agree — but the
   two stations either side of that are the interpolated ones, and this is the
   number a delivered plan view would settle first.
4. **The trace is a similarity onto a design rendering.** 87.8% silhouette
   overlap on a hull that is not this hull to the last curve, at an unknown
   focal length. Read the stations as good to a few centimetres.

---

## §27 — strict acceptance

Answered from `.qa/PHASE_4_7_1_comparison.png`, `.qa/p471-plan.png`,
`.qa/p471-cockpit3q.png`, `.qa/p471-mask.png` and the three debug frames.

| | |
|---|---|
| DO THE FORWARD CUSHIONS START ONLY FORWARD OF THE MAIN COCKPIT | **YES** — x 0.000, amidships, 1.72 m forward of the backrest |
| IS THERE A CLEAR DARK GAP BETWEEN REAR SEATING AND FORWARD CUSHIONS | **YES** — 1.72 m of `cockpit_sole`, and nothing joins them |
| IS THE CENTRAL FLOOR LARGE AND DARK | **YES** — 9.07 m² of sole at 0.010 linear; the plan's largest area by far |
| ARE THERE EXACTLY TWO SYMMETRICAL FORWARD CUSHIONS | **YES** — two connected components, 4,930 triangles and 1.918 m² each, mirror deltas 0.0 mm |
| ARE THEY NARROWER ALONG THEIR MAIN LENGTH THAN PHASE 4.7 | **YES** — and shorter: 26% less surface, and the projected cognac falls from 1.37× the plate to 0.90× |
| DO THEY FOLLOW THE INNER SIDES TOWARD THE BOW | **YES** — both edges measured against the hull at every station, clamped by its own coaming |
| DO THEY BROADEN ONLY TOWARD THE FRONT | **YES** — 0.29 m at the aft end, 0.48 m at the widest, and the widest is at x 1.3 |
| DO THEY MEET AT THE BOW | **YES** — at x 1.435, inboard edges at ±0.008 |
| IS THERE ONLY A FINE SEAM WHERE THEY MEET | **YES** — 16.0 mm, narrower than the 22 mm fillet either side of it |
| IS THE REAR SEAT A SEPARATE GEOMETRIC SYSTEM | **YES** — separate meshes, 1.72 m away, drawn yellow in the debug view to show it |
| DOES THE PROJECTED COGNAC FOOTPRINT NOW MATCH THE DELIVERED REFERENCE | **YES, MEASURABLY** — IoU 57.6% against 37.8%, area ratio 0.900 against 1.368, 77.2% of the model landing on the plate's cognac against 47.5%. It is not 100%, and §H says where the rest is. |
