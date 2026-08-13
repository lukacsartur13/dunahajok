# WEBGL_ASSET_SPEC — Duna 6.1 production model

**Status: the model does not exist yet.** The hero currently renders the approved
studio profile photograph as a composited plate (see *Interim* at the end). This
document is the delivery specification for the real thing.

> **This spec is about the Duna 6.1, not the PXL.** The PXL is a different boat,
> delivered as an STL rather than as a finished glTF, and it has already been
> through a pipeline of its own — see **[PXL_MODEL_MAP.md](PXL_MODEL_MAP.md)**
> for what was built and **[PHASE_2_5_REPORT.md](PHASE_2_5_REPORT.md)** for how.
>
> Two decisions made there supersede what this document says, and a Duna 6.1
> delivery should follow the newer answer:
>
> - **Compression is Meshopt, not Draco** (§9 below). `EXT_meshopt_compression`
>   decodes through a decoder three-stdlib already bundles, so it costs no
>   extra request and no self-hosted WASM; Draco needs one or the other.
> - **Textures are not automatically wanted** (§6–7 below). The PXL ships with
>   none: every surface on it is solid painted or moulded, and parametric PBR
>   is smaller and sharper than an atlas for that. The 6.1's teak is a real
>   reason to send maps; its paint is not.
>
> Everything else here — the coordinate contract, the origin on the waterline,
> real metres, one material per named group — is exactly what the PXL pipeline
> ended up producing independently, which is a good sign for the spec.

It is written to be handed to a 3D artist as-is. Every requirement here exists
because the scene already depends on it; the "why" is stated so that a sensible
deviation can be discussed rather than discovered at integration.

Integration point: `src/webgl/scenes/hero/vesselContract.ts`. Dropping a
compliant file into `public/models/` and flipping one `available` flag is the
entire code change.

---

## 1. Deliverables, in order

| # | File | Priority |
|---|------|----------|
| 1 | `Duna61Cabin.glb` | **First.** Blocks the hero. |
| 2 | `Duna61Kadet.glb` | Second. Phase Three (`product-morph`). |
| 3 | Camera-reference renders (§10) | With #1. Not optional. |

Deliver the Cabin alone rather than waiting to deliver both. The two are
separate files by design — the scene never assumes one model contains both
configurations.

---

## 2. Format

- **glTF 2.0 binary (`.glb`)**, single file, textures embedded.
- One root node containing the whole vessel. No scene-level cameras, no lights,
  no animation tracks, no cameras parented into the hierarchy.
- Y-up, right-handed — glTF's own convention. Do not pre-rotate for Z-up tools.

Also supply the **uncompressed source** (`.glb` or the native scene) alongside
the compressed delivery, so compression can be re-run at different settings
without going back to the artist.

## 3. Coordinate system, origin, scale

This is the part that most often needs a second round. It is worth reading
twice.

```
        +Y  up (mast/arch direction)
         │
         │        +X  BOW  ← the vessel faces +X
         │      ↗
         │    ↗
  ───────●────────────  waterline plane, y = 0
        ╱ origin
      ╱
    +Z  starboard
```

- **Forward:** bow along **+X**.
- **Up:** **+Y**.
- **Origin:** on the **design waterline**, at the vessel's longitudinal centre
  (roughly the centre of buoyancy — mid-LOA is close enough). Not at the transom,
  not at the keel, not at the bounding-box centre.
- **Scale:** **real-world metres.** LOA of the 6.1 is 6.10 m, and the model
  should measure 6.10 m along X at the sheer. Do not deliver in centimetres and
  do not "scale to fit".

**Why it matters.** The water surface is the plane `y = 0` in the same metres.
The wake is generated from the transom at `x = −LOA/2` and its wavelengths are
derived from the hull length. The camera rig is authored in metres against a
6.1 m boat. A model in centimetres does not render small — it renders a 610 m
ship on a river with 4.5 cm ripples, and every number in `heroConfig.ts` becomes
wrong at once.

`vesselContract.ts` exposes `yaw`, `scale` and `draft` so a non-compliant
delivery can be corrected without a code change. They exist as a safety net, not
as an invitation — a compliant model needs all three at their defaults.

## 4. Required mesh groups

Separate objects, named exactly. Lowercase, hyphenated, no spaces.

| Node name | Contents |
|---|---|
| `hull` | Topsides and bottom, one shell |
| `deck` | Moulded deck, coamings, non-teak surfaces |
| `teak` | Every timber surface — deck laying, bathing platform, rails, trim |
| `glass` | Windscreen, cabin glazing, any transparent panel |
| `metal` | Rails, cleats, fittings, arch, chrome |
| `upholstery` | Seating, backrests, bolsters |
| `cabin` | Cabin superstructure (Cabin model only) |
| `helm` | Console, wheel, instruments |
| `motor` | Outboard cowling, bracket, and drive leg where visible |

Rules:

- A part appears in exactly one group.
- Groups may contain sub-meshes; keep the hierarchy shallow (two levels max).
- **`motor` must be a separate node**, not welded into `hull` or `deck`. Phase
  Three swaps Suzuki and electric propulsion, and it will do so by toggling this
  node. Deliver the Suzuki outboard first.
- Anything below the waterline that is not visible from outside can be omitted.
  The water occludes it and nothing renders it.

## 5. Materials

**One material per group.** Nine materials total, not ninety. Named to match
their group (`hull`, `teak`, `glass`, …) — the scene addresses them by name
substring, so `hull-gelcoat` and `teak-deck` are fine, `Material.001` is not.

Metallic-roughness workflow (glTF standard). No specular-glossiness extension.

Targets — the scene is an overcast river at dusk, not a studio:

| Group | Base colour | Metallic | Roughness |
|---|---|---|---|
| `hull` | as painted | 0 | 0.10 – 0.22 |
| `deck` | as moulded | 0 | 0.30 – 0.45 |
| `teak` | **warm brown, not orange** | 0 | 0.42 – 0.60, varied |
| `glass` | near-neutral, slight tint | 0 | 0.03 – 0.08 |
| `metal` | as finished | 1 | 0.08 – 0.30 |
| `upholstery` | as trimmed | 0 | 0.65 – 0.85 |
| `motor` | as finished | mixed | 0.25 – 0.55 |

Notes that matter more than the numbers:

- **Teak is the material the brand is judged on.** It must read as oiled timber
  with visible grain and roughness variation, not as an orange plastic. Vary
  roughness across the planks; do not use one flat value.
- **Glass must not be black.** Use `KHR_materials_transmission` with
  `transmission ≈ 0.6–0.85` and a real `ior`, or — if transmission is not
  available in your pipeline — a low-alpha blend with `alphaMode: BLEND`. A
  windscreen rendered as opaque dark plastic is the single most common way a
  boat model looks cheap.
- **Nothing is fully glossy.** This is industrial product design. If everything
  in the render mirrors, roughness is too low everywhere.

## 6. Textures

PBR set per material, only where the map earns its place:

- `baseColor` — **sRGB**
- `metallicRoughness` — linear, packed (G = roughness, B = metallic) per glTF
- `normal` — linear, tangent space, OpenGL convention (**+Y up**)
- `occlusion` — linear, only where geometry cannot produce it (under rails,
  inside the cockpit, seat crevices)
- `emissive` — only if there is a genuinely lit element. Otherwise omit.

Maximum resolutions, by how much of the frame the surface occupies:

| Group | Max |
|---|---|
| `hull`, `deck` | 2048 |
| `teak` | 2048 |
| `upholstery`, `cabin`, `helm` | 1024 |
| `metal`, `glass`, `motor` | 1024 |

Power-of-two only. Prefer one 2048 atlas over four 1024s where the UVs allow.

### Do NOT bake into textures

- Lighting, shadows, or reflections of any kind — including "just a little" AO
  in the base colour. The scene's own sky is the light source; a baked
  highlight from a different sky is a permanent error that cannot be graded out.
- The waterline, spray, wetness, or a reflection of the hull.
- Environment or horizon reflections in the glass or the paint.
- Branding rendered as a lit 3D-looking badge. Deliver the `Duna` script as flat
  artwork in the base colour, with the geometry providing any relief.

## 7. UVs

- One UV set (`TEXCOORD_0`). A second set only if lightmaps are ever needed —
  they are not, today.
- No overlapping shells in `TEXCOORD_0`.
- Consistent texel density across the vessel; the hull should not be four times
  sharper than the teak beside it.
- 4 px padding at 1024, 8 px at 2048.
- Teak laying must run **along the plank direction** in UV space, so grain and
  caulking lines follow the deck rather than crossing it.

## 8. Polygon budget

Triangles, for the whole vessel, after triangulation:

| Target | Count |
|---|---|
| Desirable | **180 000** |
| Acceptable ceiling | 350 000 |
| Hard ceiling | 500 000 |

For context, the entire current hero scene — water disc, sky and vessel plate —
is 43 732 triangles and costs 0.21 ms of CPU per frame. Geometry is not the
constraint in this scene; **fill rate is**. So spend the budget on silhouette:

- The **sheer line and the hull edge** carry the design. They must be dense
  enough that no facet is visible against the sky at 20 m.
- Interior detail the camera never approaches can be coarse.
- No n-gons. Quads in the source, triangulated on export.
- Weld coincident vertices. Split normals only where a hard edge is intended.

### LOD

Not required for the hero: one vessel, one distance range. If the model lands
above the acceptable ceiling, deliver `_LOD1` at ~40% for Phase Three's
`product-morph`, which will show two vessels at once.

## 9. Compression

Deliver **DRACO**-compressed (`KHR_draco_mesh_compression`).
`vesselContract.ts` already declares `compression: "draco"` and the loader is
configured for it. Meshopt is accepted as an alternative — change the one field.

Suggested settings: position 14 bits, normal 10, UV 12. Textures as embedded
KTX2/Basis if your pipeline supports it, otherwise PNG/JPEG.

**Size targets:** under **6 MB** compressed, ideally under 4 MB. This is a hero
asset on a marketing site; it is loaded after the first paint, but it is still
loaded by someone on a phone.

## 10. Camera-reference renders — required with delivery

The implementation cannot be validated against the real vessel without these.
Deliver as PNG, 2000 px on the long edge, with an **orthographic** camera unless
noted, on a plain mid-grey background, unlit or flat-lit:

1. **Profile**, orthographic, starboard, bow to the right, waterline horizontal.
2. **Plan**, orthographic, from directly above, bow to the right.
3. **Bow-on**, orthographic.
4. **Stern-on**, orthographic.
5. **Three-quarter bow**, perspective, 50 mm equivalent, eye height 1.6 m at
   20 m — the closest match to the hero's own camera.
6. **Three-quarter stern**, perspective, same lens.

Plus a plain-text note stating the **measured LOA, beam and height above the
waterline** of the delivered model, in metres. Those three numbers are what the
integration is checked against.

---

## Interim: the photographic plate

Until the above is delivered, the vessel in the hero is
`public/media/vessel/duna61-cabin-profile.png` — the approved studio profile,
alpha-matted at the waterline by `scripts/build-vessel-plate.mjs` and stood up
in the scene at its true size (6.72 m visible LOA, 2.43 m above the water).

It is a composited plate, treated as one: it shares the scene's atmosphere, it
sinks into the surface, and it casts a reflection that the water tears. What it
cannot do is turn. `AZIMUTH_SCALE.plate` in `heroConfig.ts` therefore scales the
authored camera swing down from ~24° to ~8°, which is the angle at which a flat
element stops being believable.

**That constant is the one thing that changes when the model arrives.** The
choreography, the water, the wake, the camera rig and the lighting are written
against a vessel, not against a photograph, and take a mesh unmodified.
