# PXL — PHASE 4.7

**Two symmetrical side cushions, and a dark floor under them.**

Two corrections, one of topology and one of material. The first replaces Phase
4.6's forward padding entirely rather than adjusting it; the second is about
where the interior colour stops and what is underneath when it does. §21's ten
questions are answered at the foot of this file from the renders.

| | |
|---|---|
| Model | `assets/derived/pxl/PXL.production.glb` → `public/models/PXL.glb` |
| Working file | `assets/blender/PXL.blend` |
| Faces | 59,141 authored · 32,397 delivered · 0.522 MB transfer |
| Zones | 20, unchanged in name and count |
| Checks | `npm run qa` — 2,147 state · 153 vessel · model validation · topology proof, all green |
| Visual | 7 of 7 regression cases pass |
| Topology | `npm run upholstery` — **2** connected forward elements, mirror Δ 0.0 mm, seam 16.0 mm |
| Sheets | `.qa/PHASE_4_7_comparison.png` (4 rows) · `.qa/p47-debug-{top,cockpit3q,bow}.png` |
| Unchanged | `npm run paint` 0.057 mean · `npm run reference` silhouette identical |

---

## A. What Phase 4.6 built, and why the third piece was never there

`pad_splits = (0.512, 0.822)` and `pad_cross_x = (1.020, 1.880)`: one object,
starting as a raised lounge on the starboard side, sweeping across the
centreline as the hull narrowed, and cut into three meshes with 55 mm gaps.
Everything about it followed from reading `.qa/ref46/ref-fwd-pads.png` as a
single run with two seam positions in it.

**The correction says what the forward seam actually is**, and once it is said
the crop supports it better than 4.6's reading did: the line at the bow is where
the PORT and STARBOARD upholstery MEET. It is a joining line between two
leather-covered pieces, not the edge of a third cushion. Re-cropping
`ref-cockpit3q.png` at 4× with the two sides looked at separately — rather than
as one sweep — shows a padded element down each inner side, each on its own dark
moulded base, converging on the centreline and becoming slightly fuller as they
do.

So `forward_pad_plan` is not adjusted. It is rewritten, and three of Phase 4.6's
four spec fields are deleted rather than retuned:

| gone | what it described |
|---|---|
| `pad_splits` | where to cut the run into three |
| `pad_seam` (55 mm) | how much daylight to leave between the pieces |
| `pad_cross_x` | where the run left the starboard side and arrived at port |
| `pad_overhang` | how far one lounge reached inboard over the sole |

**§14 reverses 4.6's symmetry finding, and the reversal is deliberate rather
than a correction of an error.** 4.6 read the port side forward of the console
as bare sole and recorded the asymmetry as the reference's own — its §R.4 says
so and flags that the finding rested on one image. §14 requires the mirror in as
many words: "the two primary side upholstery elements are intentionally
symmetrical". §2 allows an exception only where the reference clearly proves
otherwise, and one oblique crop of a steeply-foreshortened far side is not
proof. The instruction governs. It is recorded in `Spec` beside the numbers so
that nobody re-derives 4.6's reading from the same crop a third time.

---

## B. The two cushions

`build_forward_cushions`, one mesh per side, no seam anywhere in the
fore-and-aft run — §4 requires each side to read as one continuous upholstered
form rather than as separate blocks.

**The inboard edge is a consequence, not an input.** `outboard` is measured at
every station — the coaming, or the capping's own inner edge where that is
tighter, less `pad_inset` — and `inboard` is `outboard − pad_width(x)` until
that would cross the centreline, after which it is half the seam. The station
the two cushions meet is therefore wherever the hull has narrowed to twice the
width the table asks for. It is not authored and it cannot disagree with the
hull.

Measured off the exported GLB by `_probe47`, one side, positive half-widths:

```
   x       outboard   inboard   width          what is happening
  −0.780     0.771     0.431     0.340   the aft end, 0.20 m forward of the console
   0.000     0.771     0.423     0.348   parallel to the side, on its base
   1.000     0.731     0.351     0.380   the hull begins to narrow
   1.500     0.529     0.113     0.416   turning inboard, and fuller
   1.800     0.432     0.016     0.416   about to meet
   1.908       —       0.008       —     ← THEY MEET
   2.000     0.320     0.008     0.312   running together
   2.100     0.219     0.008     0.211   the forward end
```

§10's progression — "long side pad → follows bow curvature → slightly broadens
→ turns inward → meets opposite pad" — is that table read downward. The width
grows from 0.340 to a maximum of 0.422 m before the meeting, which is the
"slightly fuller" §10 asks for and is a 24% increase rather than a flare.

**§6 — the seam is 16 mm**, and the number is the whole of it. What reads as an
upholstery joining line rather than a groove is two rolled edges nearly
touching, so the gap has to be narrower than the 22 mm fillet on each cushion's
own top edge. 4.6's 55 mm was chosen for the opposite reason — so the liner
would show between its three pieces — and at that width it is the groove §6
rules out by name.

**The corner at the meeting is rounded rather than left.** Clamping at the
centreline leaves the inboard edge with a discontinuity in its slope, and a
lofted cushion draws that as a crease across its own inboard face — visible from
directly above, which is the view §17 makes the acceptance view. Four passes of
a five-point mean turn it into a transition; the clamp is reapplied afterwards
so no smoothing pass can push a cushion across the centreline.

**§11, §12 — the hierarchy, as objects.** OUTER HULL → GUNWALE CAPPING → HARD
INNER LINER → PADDED ELEMENT, and each link is a different mesh in a different
zone. `pad_inset` holds the cushion 62 mm off the liner so the chain is visible
rather than asserted; `build_forward_base` — now mirrored, 1,964 faces, both
sides — is the moulded lip the cushion's inboard 0.10 m stands on where it
overhangs the delivered platform, and it is in the sole's graphite, not in the
interior colour.

---

## C. The hole in the floor

**`_probe47` drops rays straight down through the 4.6 production model.** At
x 1.36 → 1.48, across most of the beam, what a camera directly overhead meets is
`hull_primary` at z 0.04 — the inside of the bottom of the boat.

```
x 1.35   y 0.00..0.65  interior@0.57      y 0.70  hull_primary@0.22
x 1.40   y 0.00..0.15  interior@0.57      y 0.20..0.65  hull, z −0.03 → 0.24
x 1.45   y 0.00        nothing            y 0.05..0.65  hull, z −0.13 → 0.24
```

The bow-panel rule in `split_interior` deletes delivered interior faces from
x 1.410 and reaches back to about 1.35 through their vertices; the forward liner
began at 1.470. Nothing was ever built across the difference. Phase 4.6 could
not see it because its crossing pad lay over it — and two symmetrical side
cushions leave the centre open, which is the point of them, so it would have
been the first thing visible in the plan view.

`BOW_DECK_MIN_X` and `forward_liner_x[0]` are now one number expressed twice:
1.390 − 0.060 is 1.330, which is exactly where the liner starts. The comment on
each points at the other.

**A second thing came out of the same rebuild.** 4.6 closed the liner's flat
with `(1 − smoothstep(t/0.94)) ** 0.62`, a curve chosen to look right rather
than to serve anything, and it had the flat down to 0.21 m at x 2.00 while the
cushions there want to reach 0.28 m. Their outboard edges sat on the rising
cove, `_pad_seat` walked them inboard, and the padding thinned exactly where §10
says it should be fullest. The cove is a WIDTH now — held at a coaming's 30 mm
for three quarters of the run, then opened to the full section — so there is a
real sole under the padding for as long as there is padding, and no floor at all
by the stem. The liner runs 41 stations, flat 0.69 → 0.00, centre z 0.57 → 0.83.

---

## D. The interior material correction

**The instruction:** the visible floor and sole should be very dark grey or
near-black; the selected interior colour should appear only on genuinely
upholstered elements; "if looking at the top view the centre of the boat appears
largely covered by the custom interior colour, the interpretation is wrong."

**Half of that was already true and half of it was not.** The interior colour
has reached `upholstery_primary` and nothing else since Phase 4.3, and the
configurator suite asserts it from both ends. What was wrong is the other half
of the same question — not where the interior colour goes, but what colour the
floor is when it goes nowhere.

It was the HULL's. `interior_hard_liner` is bound to `hullPrimary`, and
`split_interior` classified as sole only the up-facing interior below z 0.47 —
which is the cockpit floor at 0.377 and nothing else. The raised side platforms
at 0.570, and after §C the whole forward floor, stayed liner and wore the
exterior finish: teal in the teal colourway, white in the white one. The plan
view of the 4.6 boat is that colour from the console to the stem.

**`PLATFORM_MAX_Z = 0.62`.** Every up-facing interior surface below it is
`cockpit_sole`; the forward liner's flat is separated out of its own shell and
joins them.

```
interior split   1,199 faces, 18.16 m²
                 sole   183 f / 9.07 m²      ← was the cockpit floor alone
                 step   551 f / 3.04 m²
                 aft    44 f / 1.74 m²
                 liner  413 f / 3.46 m²      ← now coaming, and only coaming
```

0.62 is not a round number picked for comfort: it clears the platform at 0.570,
stays under the aft deck shelf at 0.73 that `aft_deck` claims for the stern
moulding, and stays well under the coaming — which is not floor, is not walked
on, and keeps the hull's colour because §11's hierarchy needs the hard liner
visible somewhere. That is the one place the two briefs pull against each other,
and it is resolved by which surfaces are horizontal.

**`split_by_face`, and why the liner is cut after the modifiers rather than
lofted as two strips.** `solidify` and `bevel_object` both work on an object's
own boundary. Two strips built separately and then thickened get a rim each
along the edge they share, and `bevel_object` rounds every rim it finds — so a
6 mm bevel on two 16 mm shells opens a 12 mm crack down the length of the join.
One shell, separated by a per-face test afterwards, cannot open a crack because
there is no boundary there to round. The test needs the flat to be the same
three points in every ring, which is why `_liner_section` now always emits its
crown vertex even where the flat has closed to nothing.

**And the value, which is a second thing.** With the zoning right the floor
still rendered a mid grey — 103 of 255 at the centreline in the plan view,
against 37 on the plate. The studio rig lifts dark surfaces far more than mid
ones, so the delivery base came down from 0.028 to 0.010 linear:

| | plan view, centreline | plate |
|---|---|---|
| sole, 4.6 base 0.028 | 103, 105, 107 | 37, 38, 40 |
| sole, 4.7 base 0.010 | **74, 75, 77** | 37, 38, 40 |
| cognac, unchanged | 191, 112, 67 | 152, 81, 39 |

The remaining gap is the rig rather than the material, and the cognac row is the
evidence: the same lighting renders an unchanged upholstery colour 1.9× the
plate's value at this camera. Chasing the last 37 levels on the floor alone
would mean authoring a sole darker than the black upholstery finish, which is
the failure `pxlPalette` warns about in its own words — "an albedo at or near
black is where detail is lost for good". Recorded as a remaining mismatch in §G
rather than forced.

---

## E. §19 — the debug view, and why the colours are not assigned by side

`npm run upholstery` → `.qa/p47-debug-{top,cockpit3q,bow}.png`. Port RED,
starboard BLUE, everything else neutral grey, the seam left as the gap it is.

**Colouring by the sign of y would prove nothing.** The two cushions are built
as mirror images, so a picture that says "the +y triangles are blue" is a
picture of its own rule — it would look identical if the forward padding were
one piece spanning the boat, or five. So the pieces are found rather than
declared: the exported mesh is welded by position, its triangles forward of the
bench are walked as a graph, and each CONNECTED COMPONENT gets a colour. Two is
a pass; a third would draw in magenta.

```
  9412 triangles forward of x -0.90, 1024 abaft it (bench and backrest)

  piece  side     tris    area         x range          y range          z range
      1  STBD     4706   2.549 m²   -0.780.. 2.100   0.008.. 0.771   0.570.. 0.905
      2  PORT     4706   2.549 m²   -0.780.. 2.100  -0.771..-0.008   0.570.. 0.905

  MIRROR  area Δ 0 m² · x ends Δ 0.0 / 0.0 mm · z ends Δ 0.0 / 0.0 mm · outboard Δ 0.0 mm
  SEAM    16.0 mm between the two inboard faces

  PASS: 2 connected forward upholstered elements; §1 requires exactly 2
```

It rasterises itself rather than going through the browser, and that is a
decision worth stating: by the time the cushions reach the GLB they are one mesh
with one material, and giving them separate materials for the sake of a debug
view would mean shipping a division the boat does not have. A z-buffered
software rasteriser over the same file the site loads answers the question
without changing the asset to suit the question. **The debug colours are not in
the model and cannot be shipped** — nothing in `pxl_blender.py` knows about
them.

The check is in `npm run qa`, so a future phase that reintroduces a third piece
fails the build rather than the review.

---

## F. §20 — matched-scale comparison

`.qa/PHASE_4_7_comparison.png`, four rows, three columns.

| row | reference | Phase 4.6 | corrected |
|---|---|---|---|
| A · TOP | cockpit 3Q crop | `p46-plan` | `p47-plan` |
| B · COCKPIT 3Q | cockpit 3Q crop | `p46-cockpit3q` | `p47-cockpit3q` |
| C · BOW CLOSE-UP | bow interior crop | same window of `p46-cockpit3q` | same window of `p47-cockpit3q` |
| D · §19 DEBUG | top | cockpit 3Q | bow, looking aft |

Row A's reference cell is the cockpit three-quarter and the label says so: **the
delivered material contains no plan view**, and putting one of the three-quarters
under a "TOP" heading without saying which it is would be a caption that implies
a source that does not exist.

Row C is the one §20's last sentence is about. The 4.6 column shows three
slab-sided orange panels lying across the bow on a pale hull-coloured floor; the
4.7 column shows two padded sides converging to a fine line on a dark one. They
are the same camera, the same crop and the same boat.

**The plan view is the acceptance view and it is worth reading in its own
right.** From above: the cockpit sole runs dark from the transom to the stem;
the two cushions frame it from the sides, 0.85 m of open floor between them
amidships; they turn inboard together and meet at x 1.908; forward of the
meeting there is one 16 mm line on the centreline and no other division. The
centre is not orange anywhere.

---

## G. Remaining mismatches

1. **The sole renders at 74 of 255 against the plate's 37.** §D has the
   measurement and the reason. It is the studio rig rather than the material,
   and the same rig renders the unchanged cognac 1.9× the plate's value at the
   same camera; a further correction belongs in the lighting, where it would
   affect every surface, rather than in one zone's albedo.
2. **The cushions' aft ends are square.** The reference's appear to be too, but
   the crop is oblique there and a chamfered end is possible. Carried forward
   from Phase 4.6 §Q.4 unchanged.
3. **The meeting station is a consequence, and nothing measures it against the
   drawing.** x 1.908 falls out of the hull and `pad_width`; the crop shows the
   two sides meeting well forward and does not fix a station to better than
   about 0.2 m in a perspective view. If the yard supplies a plan this is the
   first number to check.
4. **The cushion tops sit 0.127 m high relative to the gunwale.** Unchanged and
   source-limited: the platform they stand on is delivered geometry.
5. **The hard-liner band outboard of the cushions is now dark rather than the
   hull's colour**, because §D's rule takes the platform's up-facing top. The
   coaming above it still carries the hull colour, so §11's hierarchy is legible
   — but a reference that showed a pale band at deck level between the cushion
   and the coaming would disagree with this, and no delivered view resolves it
   at that scale.

## H. Source-limited

1. **No plan view was delivered.** Every judgement about the forward padding's
   layout comes from one cockpit three-quarter and one stern three-quarter, and
   §17 makes the plan the acceptance view — so the acceptance view is one the
   reference does not have. This is why §19's topology proof is a measurement
   rather than a picture.
2. **The port element is drawn once, obliquely.** §14's symmetry is followed as
   an instruction. It is not confirmed by a source that shows both sides at a
   comparable angle, and §A records that this reverses what 4.6 concluded from
   the same crop.

---

## §21 — the final questions

Answered from `.qa/PHASE_4_7_comparison.png`, `.qa/p47-plan.png`,
`.qa/p47-cockpit3q.png` and the three §19 debug frames, after looking at them.

| | |
|---|---|
| ARE THERE EXACTLY TWO MAIN FORWARD UPHOLSTERED ELEMENTS | **YES** — two connected components, 4,706 triangles each, asserted by `npm run qa` |
| ARE THEY PORT / STARBOARD SYMMETRICAL | **YES** — mirror deltas of 0.0 mm on every bound and 0 m² on area |
| DO THEY RUN FORWARD ALONG BOTH INNER SIDES | **YES** — x −0.780 → 2.100 each, outboard edge on the coaming less 62 mm |
| DO THEY FOLLOW THE HULL CURVATURE INTO THE BOW | **YES** — both edges measured against the hull station by station, never authored |
| DO THEY BECOME SLIGHTLY FULLER NEAR THE BOW | **YES** — 0.340 m amidships to 0.422 m at the widest, before the meeting |
| DO THEY MEET AT THE BOW CENTRELINE | **YES** — at x 1.908, inboard edges at ±0.008 |
| IS THEIR MEETING POINT SEPARATED ONLY BY A SUBTLE SEAM | **YES** — 16.0 mm, narrower than the 22 mm fillet either side of it |
| IS THERE NO THIRD INDEPENDENT BOW CUSHION | **YES** — a third component would fail the build, and would draw magenta if it did not |
| DOES THE CENTRE COCKPIT/FLOOR REMAIN OPEN | **YES** — 0.85 m of open sole between the cushions amidships, and it is dark |
| DOES THE RESULT NOW MATCH THE UPHOLSTERY LAYOUT OF THE DELIVERED REFERENCE | **YES**, with the five mismatches in §G named rather than claimed away |

The last answer is given from row C of the comparison sheet rather than from any
number above it: the bow crop of the reference and the bow crop of the corrected
model now show the same thing — two leather-covered sides converging to a line —
where the 4.6 crop beside them shows three panels and a pale floor.
