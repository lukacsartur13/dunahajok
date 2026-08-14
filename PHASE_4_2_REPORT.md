# PHASE 4.2 — PXL ASSET REBUILD / GEOMETRY CORRECTION

**Reference-locked configurator fix.** This phase was not about architecture,
features or polish. It was about one question: does the boat in the browser look
like the boat in the delivered drawings? It did not, in four specific and
diagnosable ways. This is what was wrong, what was done, and what is still wrong.

Everything below was measured. Where something is an estimate or an
approximation it says so.

---

## A — Current configurator audit

Audited: `assets/derived/pxl/PXL.source.glb` (the archival STL recovery, 45,681
faces, 13 zones), `public/models/PXL.glb` (the shipped asset, 20,235 triangles),
and the live configurator at `/dev/pxl` read through `window.__pxlQa.zones()`.

The live read is the one that settles arguments, because it reports the colour
each material is **wearing** rather than the colour the catalogue intended. At
`exterior=navy&lower=body&interior=cognac` it returned:

```
hull_primary   EXTERIOR_HULL    #1b3a5c   5,818 t
hull_lower     HULL_BOTTOM      #1b3a5c   7,187 t
hull_accent    GUNWALE_CAPPING  #14161a     792 t
transom_black  STERN_MOULDING   #101215   2,254 t
deck_main      INTERIOR_LINER   #8a4d24   1,149 t   ← the entire interior
deck_trim      EXTERIOR_HULL    #1b3a5c      10 t   ← exterior paint, indoors
```

Two rows in that table are the whole phase. `deck_main` is one mesh covering
17.6 m² of interior — liner, sole, coaming walls, inner transom face — wearing
one material driven by one channel, so the cockpit colour painted all of it.
`deck_trim` is the bow panel and the console base plate, physically inside the
boat, bound to `EXTERIOR_HULL` and therefore painted with the topsides.

Four defects, matching the brief's four:

| Brief | Finding |
|---|---|
| Layered surfaces overlapping / reading incorrectly | Not stacked shells. **Eighty-four stray interior islands on the outside of the hull**, plus **29 foredeck faces with inverted normals**. §B |
| Deck / interior colour blocking wrong | The interior is one zone. All 17.6 m² of it takes the cockpit colour. §C |
| Bow / front fitting wrong | The capping **stops 0.57 m short of the stem**; there is **no bow fitting in the asset at all**. §D |
| Does not reflect the references | Consequence of the above. §L |

---

## B — Overlapping and layered geometry findings

**There are no duplicated shells, and this was checked rather than assumed.**
Every pair of the thirteen zones was tested for coincident face centroids within
2 mm:

```
deck_main     × hull_lower       76 faces  (2.8% of deck_main)
hull_primary  × transom_black    10 faces  (0.1%)
hull_lower    × hull_primary      6 faces  (0.0%)
deck_main     × transom_black     4 faces  (0.1%)
```

Ninety-six coincident faces out of 45,681. Every one of them is on a zone
boundary, and they are the residue of `build_pxl.py` cutting the stern-panel
line *through* the triangles it crossed. That is not z-fighting; it is a seam.
**The "overlapping surfaces" the brief reports are not overlapping surfaces.**

What they actually are:

**1. Confetti.** `deck_main` is 2,743 faces in **90 disconnected islands**. Four
of them (517, 515, 335, 329 faces) are the inner face of the transom. The other
eighty-six are between 1 and 68 faces each and are scattered across the
*outside* of the hull. They exist because `pxl_zones.split_hull` assigns
`DECK_MAIN` as its default — every face the outward-ray test fails to claim
falls into it — and a SketchUp export has inconsistently wound triangles all
over it. Painted with the cockpit colour, those eighty-six islands are cognac
speckle on the topsides. From a distance they read as the hull showing something
underneath it.

**2. An upside-down foredeck.** The bow is decked over at z 0.87, 70 mm below
the sheer, and **every face of that deck points at the keel**. It never
disappeared, because these zones are drawn double-sided; it simply lit as though
the sun were beneath the boat. Found by raycasting a grid over the bow and
reading the hit normals — `n.z = −1.00` at every station from x 1.60 to 2.20.

**3. A capping that gives out.** `hull_accent` runs from x −2.58 to **+2.06**.
The hull runs to +2.63. For the last 570 mm to the stem the topsides colour runs
straight to the deck edge, and the band ends in a hard horizontal termination.

---

## C — Deck / interior material zoning findings

The references show three interior materials. The model had one.

Reading `pxl-views-20240815c.jpg` (the cockpit three-quarter is the only view
that resolves this):

| Surface | Reference treatment |
|---|---|
| Raised platform tops — aft deck, side decks, bow platform | **Cognac, upholstered**, standing proud with a visible edge |
| Cockpit sole | **Dark graphite**, textured deck covering |
| Coaming walls, inner shell, foredeck | **The hull's own colour** — sage in the sage renders |
| Console body | Pale, close to the hull colour, with a dark screen above |
| Rails, coaming inlay line, deck cleats | Cognac hardware |

**The geometry to carry that was already in the model.** Rasterising the
interior's up-facing faces by height gives two populations with almost nothing
between them:

```
z 0.354 – 0.400    3.40 m²   the sole
z 0.446 – 0.492    0.05 m²   (empty)
z 0.537 – 0.583    4.49 m²   the raised platform
z 0.675 – 0.767    0.63 m²   the coaming tops
```

Those surfaces had simply never been separated. The cut is placed at z 0.47, in
the gap, and at z 0.66 below the coaming tops.

---

## D — Bow fitting findings

Two things are wrong at the bow, and they compound.

**The capping termination.** Described in §B. In profile it is a wedge that
stops; from the bow three-quarter it is the most conspicuous edge on the boat.
This is very probably what the brief describes as a "small front element / peg at
the bow" — there is no peg in the asset, and a hard-terminating black band at
the stem is what a peg would look like.

**There is no bow fitting.** Both three-quarter references put the same part on
each bow side deck: a low cognac plate with rounded ends, lying flush
fore-and-aft, with two apertures and a slim bar over each — a pull-through
mooring cleat. Nothing in the STL corresponds to it. It was not a bad fitting; it
was an absent one.

The side deck it belongs on is real: a surface at z ≈ 0.87 running from x 1.6 to
2.2, 41–68 mm below the sheer — the same inverted foredeck from §B.

---

## E — Decision: salvage vs rebuild

**Salvage the hull surface. Rebuild the zone partition and the interior.**

The hull shell is genuine designer geometry and it measures well against the
plate: hull depth within 2.6%, keel deviation 45 mm mean, and the dark lower
treatment's edge at 72.1% of local depth against the drawing's 71.4% — the
strongest agreement in the whole comparison. Discarding that to remodel a hull
from two JPEGs would have replaced measured geometry with a reconstruction and
made the boat *less* accurate. §13 of the brief says not to choose the faster
path if it produces an inferior boat; it also does not oblige choosing the
larger one.

Everything above the surface was rebuilt: the partition, the interior
separation, the normals, the capping's forward run, and two authored parts.

**The method is surgical.** Every face keeps the zone `build_pxl.py` gave it,
carried across the join as a mesh attribute. The new stage only *moves* faces
between zones, and only where a measurement says the existing assignment is
wrong. The hull surface itself is never regenerated — which is why §L's
silhouette numbers are identical to Phase 4.1's, to four decimal places.

---

## F — Blender workflow

Blender 5.2.0 LTS, headless, as a new stage between the two that existed:

```
PXL-3D.stl
  → build_pxl.py          STL recovery — UNCHANGED, still writes the archival master
  → pxl_blender.py        NEW — geometry correction            ← this phase
  → compress-pxl.mjs      simplify · reorder · meshopt          (source path changed)
  → public/models/PXL.glb
```

```bash
npm run pxl          # the whole chain
npm run pxl:blender  # the Blender stage alone
```

`scripts/pxl/pxl_blender.py` reads `assets/derived/pxl/PXL.source.glb` and never
writes to it. It produces:

| Output | What it is |
|---|---|
| `assets/derived/pxl/PXL.production.glb` | The corrected asset, 46,668 faces, 1.08 MB |
| `assets/blender/PXL.blend` | The working source, saved every run |

The stage is a script rather than a hand-edited `.blend` on purpose: the whole
pipeline's contract is that re-running it on a revised STL reproduces the same
zones without a human in the loop, and a manual edit would end that. The `.blend`
is an output for inspection, not an input.

---

## G — Geometry corrections made

In order, with the numbers the run prints:

| # | Correction | Effect |
|---|---|---|
| 0 | **Weld** the six shell zones back into one skin | 2,179 duplicate vertices merged; 39,580 faces |
| 1 | **Despeckle** — any connected same-zone patch under 0.020 m² takes the zone most of its boundary neighbours carry | **1,960 faces** relabelled; the eighty-six stray islands are gone |
| 2 | **Upright the deck normals** — near-horizontal interior faces are made to face up | **29 faces** flipped |
| 3 | **Split the interior** by height and facing | 1,199 faces / 18.16 m² → **4.88 m² upholstery · 4.19 m² sole · 9.10 m² liner** |
| 4 | **Cut** the shell along the capping's lower edge at the bow, `bisect_plane` at z 0.860 | +282 faces, exact border |
| 5 | **Extend the capping** to the stem | **714 faces**; band 74 mm below the sheer |
| 6 | **Lift the squabs** 35 mm, then clip them inboard of the topsides | 214 faces; **71 vertices** clipped |
| 7 | **Build the coaming inlay** on the capping's own top boundary loop | 809 faces, 30 mm deep, full length |
| 8 | **Build the bow cleats**, placed by deck raycast | 2 × 190 × 72 mm, 41–68 mm below the sheer |

Three of these were got wrong first and are worth recording, because each failure
was a new instance of the defect the phase existed to remove:

- **Despeckling by face count deleted real mouldings.** This hull is tessellated
  wildly unevenly — 11,000 triangles for a nearly flat transom, 3.2 m² of sole in
  a few hundred large facets — so a face-count ceiling keeps dense slivers and
  eats sparse surfaces. Measuring patch **area** inverts that correctly.
- **`inset_region` on the squabs put a vertex at y +2.33 m**, 1.25 m outside the
  beam, drawn as a long cognac splinter lying across the topsides. Its even-offset
  corner solve ran away on an obtuse bow corner. Replaced with an extrusion, which
  has no such solve.
- **Lifting the squabs pushed them out through the hull.** The platform tops are
  cut from the same welded skin as the topsides, so their outboard edge *is* the
  hull; raising it 35 mm lands it wherever the hull has got to 35 mm higher.
  Every squab vertex now fires a ray outboard and is pulled 15 mm inside whatever
  it finds.

A fourth was a cost rather than a defect: classifying the capping's new lower
edge per face produced a comb at the stem, where the hull is tessellated as tall
vertical slivers. Subdividing first took the comb's teeth from 60 mm to 20 mm and
cost 13,000 triangles — smaller, still a comb. `bisect_plane` puts new vertices
exactly on the plane, so the border is a straight line by construction, and costs
282.

**What was deliberately not touched.** The chine. The boundary between black
bottom and painted topsides is the designer's own crease and measures at 72.1%
of local depth against the plate's 71.4%; replacing a designed edge with a
threshold would be a regression dressed as a fix.

---

## H — Branding preservation

**Nothing was re-placed, because nothing had to be.** All three marks are found
by raycasting the real geometry at load — `pxlDecals` fires a ray inboard from
outside the beam and takes the surface point and face normal from whatever it
hits. The two zones they land on, `transom_black` and `hull_accent`, kept their
names and their surfaces through the rebuild, so the marks re-found themselves.

Measured after the rebuild, by `npm run vessel`:

```
side        x       y       z    width   normal·z
starboard  -2.297   0.364   0.998   0.290    0.961
port       -2.297   0.364  -0.998   0.290   -0.980
```

Live, from `__pxlQa.state().marks`:

```
pxl_wordmark_starboard · pxl_wordmark_port
duna_script_starboard  · duna_script_port
pxl_plexi                                    screen: true
```

Five mark meshes and the plexi screen, unchanged. This is the architecture from
Phase 4.1 paying for itself: placement derived from geometry survives a
re-export, and placement remembered as coordinates would not have.

One thing did change and is worth stating: **the capping now runs to the stem**,
so the ground the Duna script sits on is longer than it was. The script's own
station (x +0.213) is nowhere near the extension, so its placement is unaffected.

---

## I — Interior material assignment corrections

The channel that caused the problem is now bound to one zone:

| Channel | Was bound to | Is bound to |
|---|---|---|
| `interiorPrimary` | `deck_main` — the whole interior, 17.6 m² | **`interior_pads`** — the upholstery, 4.88 m² |
| `hullPrimary` | `hull_primary`, `deck_trim` | `hull_primary`, **`deck_liner`** |
| `sole` | — | **`deck_sole`** (new channel, one finish, not offered) |
| `metal` | `rails` | `rails`, **`coaming_inlay`**, **`bow_fitting`** |

Three new roles: `INTERIOR_SHELL`, `SOLE`, `UPHOLSTERY`. `INTERIOR_LINER` is
gone. The rule this file has always had is unchanged — *a role exists when a mesh
exists to carry it* — and this phase is the first time three meshes existed.

**The liner follows the exterior finish.** It is the same moulding as the
topsides seen from inboard, and every reference shows it that way. Choosing Navy
now gives a navy cockpit shell, which is what a moulded liner does.

Three runtime consequences, each of which would have been a visible bug:

- **`INTERIOR_SHELL` joins the finish sweep.** Bound to `hullPrimary` but left
  off the sweep, it would snap to the new colour on frame one while the hull
  outside it took 520 ms — and the cockpit preset is the one view showing both.
- **The grain moved.** `UPHOLSTERY` and `SOLE` keep the triplanar micro-normal;
  `INTERIOR_SHELL` does not, because it now wears sprayed paint and graining it
  would put a leather texture on a topcoat — which is what the entire interior
  looked like before this phase.
- **Sheen moved with it.** Floored non-zero before the first compile on
  `UPHOLSTERY` only. It is the only leather on the boat.

Verified live at `exterior=navy&lower=body&interior=cognac`:

```
interior_pads   UPHOLSTERY       #8a4d24    276 t   ← the only cognac surface
deck_liner      INTERIOR_SHELL   #1b3a5c    406 t   ← follows the topsides
deck_sole       SOLE             #313233    107 t   ← graphite, not cognac
coaming_inlay   HARDWARE         #a2571f  1,618 t
bow_fitting     HARDWARE         #a2571f    168 t
```

`npm test` now asserts `zonesForChannel("interiorPrimary") === ["interior_pads"]`.
That regression is invisible to every other test in the suite — the schema stays
valid, the URL still round-trips, no console errors — and the boat looks wrong.
It is the assertion worth having.

---

## J — Propulsion compatibility

Unaffected, and confirmed rather than assumed. The four proxy drives mount at
`PXL_MOUNTS.transom`, which is read off the delivered GLB's `transom_black`
bounding box; the transom was not modified. `npm run vessel` after the rebuild:

```
drive       tris     len     hgt     wid    fwd-most   deepest
compact     1520   0.542   1.185   0.325  -2.627   -0.122
standard    1520   0.651   1.398   0.382  -2.627   -0.228
large       1520   0.782   1.599   0.435  -2.627   -0.305
electric    1520   0.536   1.252   0.297  -2.627   -0.249
```

Every drive's forward-most point is still the transom plane at −2.6266 m, so
nothing enters the hull. Rendered and checked at `reference_stern_3q` for compact
and electric — §L rows G and H.

---

## K — Lower-hull compatibility

Unaffected. `hullLower` and `sternMoulding` are still separate channels bound to
separate meshes, so FULL BODY COLOUR still repaints the bottom without taking
the PXL mark's ground with it. No hull variant is baked; there is still one GLB.

Rendered at both settings on the same finish — §L rows A and B. Under FULL BODY
the bottom reads `#1b3a5c`, identical to the topsides; under DARK LOWER it reads
black while `transom_black` stays `#101215`.

---

## L — Fidelity comparison against the references

Eight states rendered through `window.__pxlQa` at the four reference cameras.
The matrix the brief asks for in §19, and the answer in each case:

| | State | Camera | Result |
|---|---|---|---|
| A | navy · **full body** · cognac · compact | `reference_side` | Bottom matches topsides; capping and inlay run the full length; both marks present |
| B | navy · **dark lower** · cognac · compact | `reference_side` | Black bottom cleanly separated at the designer's chine |
| C | **white** (light) · dark · cognac · **electric** | `reference_water_side` | Light exterior holds; PXL mark switches to dark ink on the light ground |
| D | **black** (dark) · dark · cognac · compact | `reference_water_side` | Hull form still reads; chine and sweep both visible |
| E | sage · dark · **cognac** | `reference_top_3q` | Cognac on the platform tops only; graphite sole; sage coaming |
| F | sage · dark · **sand** | `reference_top_3q` | Pads change, sole and liner do not |
| G | navy · dark · cognac · **electric** | `reference_stern_3q` | Drive scale reads against transom; pads and marks correct |
| H | sage · dark · cognac · **compact** | `reference_stern_3q` | As above |

The silhouette measurements are unchanged from Phase 4.1, which is the expected
result of not having touched the hull surface — `npm run reference`:

```
hull depth        plate 1.133 m   model 1.163 m   (−2.6%)
sheer deviation   mean 0.0582 m   max 0.1505 m    (n=10)
keel  deviation   mean 0.0452 m   max 0.0798 m    (n=21)
band edge         plate 71.4%     model 72.1%     of local depth
```

Budget after the rebuild:

| | Phase 4.1 | Phase 4.2 | Ceiling |
|---|---:|---:|---:|
| Transfer | 0.30 MB | **0.341 MB** | ~0.40 MB |
| Triangles | 20,235 | **20,574** | ~25,000 |
| Meshes / materials | 13 / 13 | **16 / 16** | — |

Three more meshes and 339 more triangles buys the interior separation, the inlay
and the cleats. `npm run model`, `npm run vessel` and `npm test` all pass —
16 zones, 1,822 + 125 checks.

---

## M — Remaining mismatches

Honest list. Each is visible; none is hidden behind a passing test.

1. **The console is still the superseded revision.** The STL's low faceted
   console, not the colour studies' tall glazed tower. Unchanged from Phase Four
   and unchangeable without geometry nobody has supplied. It remains the single
   largest perceptual gap between the studies and the live model.
2. **No seat backs.** The aft cockpit reference shows an angular cognac backrest
   standing on the aft deck. The STL has no such form, and it was not invented —
   inventing a seat is not the same class of act as extending a moulding that
   demonstrably continues. The aft deck is upholstered and flat.
3. **The upholstery is uniform across all platform tops.** The references show
   the aft deck fully upholstered and parts of the side decks as hard moulding.
   The split is by height, so it cannot distinguish them. It is an approximation
   in the right direction — 4.88 m² of cognac against 17.6 m² before — and it is
   an approximation.
4. **No bow grab rails.** The references run a cognac rail along each bow side
   deck. The delivered `rails` zone covers only x −2.59 to −1.16, the aft half.
   Not added this phase.
5. **The stern rubbing moulding is still absent** — 774 mm of it, aft of the
   transom, on the plate and not in the STL. Source-blocked since Phase 2.
6. **The Duna script artwork is still a mechanical trace.**
   `provisional_brand_artwork` remains `true`.

---

## N — Source limitations still blocking perfection

Unchanged from the Phase 4.1 list, restated because none of them moved:

| Missing | Blocks |
|---|---|
| Production console geometry | §M1, the `console` and `glazing` ranges, the `detail` view |
| Upholstery geometry and specification | §M2, §M3 — real cushions rather than a lifted moulding |
| **A UV set on the model** | A real leather map on the squabs. The grain is triplanar because an STL has no texture coordinates. |
| The Duna logotype as a vector | §M6 |
| A revised STL with the stern moulding | §M5 |
| Engine range | Replacing four neutral proxies |
| Approved colour names and paint codes | `finishLabel(f, "public")` returning anything at all |

---

## O — Recommendation for the next phase

**Do not spend it on the PXL asset.** The remaining items are almost all
source-blocked, and the two that are not — bow rails and a seat back — are small
and cosmetic. The configurator is now a fair representation of what the yard has
actually supplied, which is what it was not before.

In order:

1. **Send the yard a specific list.** The console, a UV set, and the Duna vector
   would close §M1, §M6 and most of the material realism in one exchange. This is
   the highest-value action available and it costs no engineering.
2. **Finish the rest of the site.** Phase 4.2 was scoped to the PXL configurator
   and the rest of the site has been waiting since Phase Four.
3. **Add the bow rails** when something else is open in Blender — half an hour,
   and the last purely-visual gap that is not source-blocked.

If the console does arrive, the replacement procedure in
`PXL_CONFIGURATOR_MODEL_MAP.md` §6 is unchanged and still requires no
configurator code.

---

## FINAL STATEMENTS

**PXL GEOMETRY CORRECTED: YES.** Eighty-six stray islands dissolved, 29 inverted
foredeck normals turned upright, the gunwale capping carried the final 570 mm to
the stem on an exact plane cut. No duplicated shells existed; that was measured,
not assumed.

**INTERIOR ZONING CORRECTED: YES.** The interior is three zones and three roles
instead of one. The cockpit colour reaches 4.88 m² of upholstery instead of
17.6 m² of everything, the sole is graphite, and the liner follows the topsides.
Asserted by `npm test`, verified live through `__pxlQa.zones()`.

**BOW FITTING CORRECTED: YES.** A flush cognac pull-through cleat, 190 × 72 mm,
on each bow side deck, placed by raycast onto the real deck surface — the part
the references show, in the place they show it. The hard capping termination that
read as a wedge at the stem is gone.

**PXL REFERENCE FIDELITY IMPROVED TO MATCH IMAGES: YES, with the reservations in
§M.** The side profile, the black lower treatment, the capping and its cognac
inlay, the interior material blocking and the branding now read as the drawings
do. It is not a complete match and the gap has a name: **the console is a
different design revision from the one in the colour studies**, and no amount of
geometry work on this side closes it. That is stated rather than disguised.
