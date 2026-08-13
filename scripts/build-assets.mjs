/**
 * Duna Boats — asset pipeline.
 *
 * Pulls the source photography from the existing dunahajok.hu media library,
 * crops out burned-in marketing typography, and derives colour-graded WebP
 * masters into /public/media. next/image handles responsive resizing and AVIF
 * negotiation at request time, so we only need one high-quality master each.
 *
 * Also emits src/lib/media.generated.ts — intrinsic dimensions plus a base64
 * LQIP for every asset, so every <Image> can ship a blur placeholder without
 * a runtime round-trip.
 *
 *   npm run assets            # incremental, uses scripts/.cache
 *   npm run assets -- --force # re-download and re-derive everything
 *
 * `crop` removes fractions of each edge: [left, top, right, bottom].
 * `grade` nudges saturation/brightness so the mixed-provenance library reads
 * as one coherent set. Keep it subtle — these are documentary photographs.
 */

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, "scripts", ".cache");
const OUT = path.join(ROOT, "public", "media");
const MANIFEST = path.join(ROOT, "src", "lib", "media.generated.ts");
const BASE = "https://dunahajok.hu/wp-content/uploads/";
const FORCE = process.argv.includes("--force");

/** @type {Array<{id:string,src:string,group:string,alt:string,crop?:number[],grade?:{saturation?:number,brightness?:number},maxWidth?:number}>} */
const ASSETS = [
  // ─── HERO ────────────────────────────────────────────────────────────────
  {
    id: "hero-danube",
    src: "2022/05/0627a.jpg",
    group: "HERO",
    alt: "A Duna 6.1 Cabin under way on the Danube, its wake opening across dark water.",
    grade: { saturation: 0.82, brightness: 0.99 },
  },
  {
    id: "hero-danube-alt",
    src: "2022/05/0627c.jpg",
    group: "HERO",
    alt: "A Duna 6.1 Cabin turning on the Danube near Győr.",
    grade: { saturation: 0.84 },
  },
  {
    id: "pair-onshore",
    src: "2026/08/2-hajo-kesz-4.jpg",
    group: "HERO",
    alt: "A Duna 6.1 Kadét and a Duna 6.1 Cabin drawn up on the riverbank.",
    crop: [0, 0, 0.19, 0],
    grade: { saturation: 0.85 },
  },

  // ─── PRODUCT: CABIN ──────────────────────────────────────────────────────
  {
    id: "cabin-studio-profile",
    src: "2022/05/S2j.jpg",
    group: "CABIN",
    alt: "The Duna 6.1 Cabin in profile on a concrete plinth in a white studio.",
  },
  {
    id: "cabin-studio-bow",
    src: "2022/05/S5.jpg",
    group: "CABIN",
    alt: "The Duna 6.1 Cabin seen bow-on in a white studio, showing the faceted hull.",
  },
  {
    id: "cabin-studio-helm",
    src: "2022/05/S3.jpg",
    group: "CABIN",
    alt: "The teak helm of the Duna 6.1 Cabin, photographed in the studio.",
  },
  {
    id: "cabin-exterior",
    src: "2022/05/2.jpg",
    group: "CABIN",
    alt: "The Duna 6.1 Cabin alongside a timber pontoon on the Danube.",
    grade: { saturation: 0.86 },
  },
  {
    id: "cabin-helm",
    src: "2022/05/nagy-kep4.jpg",
    group: "CABIN",
    alt: "Teak steering wheel and instrument binnacle of the Duna 6.1 Cabin.",
  },
  {
    id: "cabin-cockpit",
    src: "2022/05/6.jpg",
    group: "CABIN",
    alt: "The Duna 6.1 Cabin cockpit from above: folding teak table and upholstered seating.",
  },
  {
    id: "cabin-interior",
    src: "2020/08/CBN002-b.jpg",
    group: "CABIN",
    alt: "Teak table and upholstery inside the Duna 6.1 Cabin.",
  },

  // ─── PRODUCT: KADÉT ──────────────────────────────────────────────────────
  {
    id: "kadet-exterior",
    src: "2026/08/DUNA-KADET20260805.jpg",
    group: "KADET",
    alt: "The Duna 6.1 Kadét under way, showing its open cockpit and teak deck.",
    crop: [0, 0, 0.31, 0],
    grade: { saturation: 0.86 },
  },
  {
    id: "kadet-underway",
    src: "2026/08/Kadet-galeria-menu2-1.jpg",
    group: "KADET",
    alt: "The Duna 6.1 Kadét running with a Suzuki outboard on still water.",
    crop: [0.25, 0, 0, 0],
    grade: { saturation: 0.86 },
  },
  {
    id: "kadet-dash",
    src: "2023/01/belso2.jpg",
    group: "KADET",
    alt: "The Duna 6.1 Kadét dashboard: solid teak fascia with analogue gauges.",
  },

  // ─── DETAIL / TEAK ───────────────────────────────────────────────────────
  {
    id: "teak-rail",
    src: "2022/05/3.jpg",
    group: "TEAK",
    alt: "Close view of a hand-finished teak gunwale against the Danube.",
    grade: { saturation: 0.9 },
  },
  {
    id: "teak-bow",
    src: "2022/05/CBN003-8.jpg",
    group: "TEAK",
    alt: "The teak foredeck and Duna script badge of a 6.1 Cabin at its mooring.",
  },
  {
    id: "teak-deck",
    src: "2022/05/CBN003-7.jpg",
    group: "TEAK",
    alt: "Laid teak decking and stainless rail on the foredeck of a Duna 6.1.",
  },
  {
    id: "teak-platform",
    src: "2022/05/CBN003-5.jpg",
    group: "TEAK",
    alt: "The teak bathing platform of a Duna 6.1 seen from above.",
  },

  // ─── DESIGN ──────────────────────────────────────────────────────────────
  {
    id: "design-render",
    src: "2022/09/SLIDE-0902.jpg",
    group: "DESIGN",
    alt: "A design rendering of the Duna 6.1 hull in profile.",
    crop: [0.31, 0, 0, 0],
  },

  // ─── MANUFACTURING / GYŐR ────────────────────────────────────────────────
  {
    id: "gyor-facility",
    src: "2022/06/HM1.jpg",
    group: "WORKSHOP",
    alt: "The Duna Hajók facility on Ikrényi út in Győr.",
    grade: { saturation: 0.82 },
  },
  {
    id: "gyor-boat-trailer",
    src: "2022/06/950A3282.jpg",
    group: "WORKSHOP",
    alt: "A finished Duna 6.1 on its trailer outside the Győr workshop.",
    grade: { saturation: 0.84 },
  },
  {
    id: "brand-mark",
    src: "2024/09/rolunk-20240913.jpg",
    group: "WORKSHOP",
    alt: "The Duna Hajók maker's plate mounted on a hull.",
  },
  {
    id: "workshop-engine",
    src: "2024/09/1.jpg",
    group: "WORKSHOP",
    alt: "An outboard powerhead opened up on the bench in the Győr service workshop.",
  },

  // ─── POWER / SUZUKI ──────────────────────────────────────────────────────
  {
    id: "suzuki-engine",
    src: "2022/11/KEP2.jpg",
    group: "SUZUKI",
    alt: "The cowling of a Suzuki four-stroke outboard, opened to show the powerhead.",
  },

  // ─── HERITAGE ────────────────────────────────────────────────────────────
  {
    id: "heritage-steamer",
    src: "2025/11/webre2.jpg",
    group: "HISTORY",
    alt: "A restored Danube paddle steamer under way, seen from above.",
    grade: { saturation: 0.85 },
  },
  {
    id: "heritage-salon",
    src: "2025/12/galeria-hajoepites.jpg",
    group: "HISTORY",
    alt: "The restored timber saloon of a historic Danube passenger vessel at night.",
    crop: [0, 0, 0, 0.18],
  },
  {
    id: "heritage-night",
    src: "2025/11/IMG-cddf97c7839f81b972b6bd441fa12ae3-V.jpg",
    group: "HISTORY",
    alt: "A historic Danube vessel passing the Chain Bridge in Budapest at night.",
    grade: { saturation: 0.8 },
  },
];

const MAX_WIDTH = 2200;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchSource(src) {
  const cached = path.join(CACHE, createHash("sha1").update(src).digest("hex") + path.extname(src));
  if (!FORCE && (await exists(cached))) return readFile(cached);

  const res = await fetch(BASE + encodeURI(src));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  return buf;
}

/** Crop by edge fractions, then resize down to the master width. */
function pipeline(input, asset) {
  let img = sharp(input).rotate();
  return img.metadata().then((meta) => {
    const [l = 0, t = 0, r = 0, b = 0] = asset.crop ?? [];
    if (l || t || r || b) {
      const left = Math.round(meta.width * l);
      const top = Math.round(meta.height * t);
      img = img.extract({
        left,
        top,
        width: Math.round(meta.width * (1 - l - r)),
        height: Math.round(meta.height * (1 - t - b)),
      });
    }
    const width = Math.min(asset.maxWidth ?? MAX_WIDTH, Math.round(meta.width * (1 - l - r)));
    img = img.resize({ width, withoutEnlargement: true, kernel: "lanczos3" });
    if (asset.grade) img = img.modulate(asset.grade);
    return img;
  });
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  const entries = [];

  for (const asset of ASSETS) {
    const dest = path.join(OUT, `${asset.id}.webp`);
    const source = await fetchSource(asset.src);
    const img = await pipeline(source, asset);

    const { data, info } = await img
      .clone()
      .webp({ quality: 82, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(dest, data);

    // 20px-wide LQIP, blurred so the upscale reads as a soft field of colour.
    const lqip = await img.clone().resize({ width: 20 }).blur(1.4).webp({ quality: 40 }).toBuffer();

    entries.push({
      id: asset.id,
      group: asset.group,
      alt: asset.alt,
      src: `/media/${asset.id}.webp`,
      width: info.width,
      height: info.height,
      blurDataURL: `data:image/webp;base64,${lqip.toString("base64")}`,
      credit: BASE + asset.src,
    });

    console.log(
      `  ${asset.id.padEnd(24)} ${String(info.width).padStart(4)}×${String(info.height).padEnd(4)}  ${(data.length / 1024).toFixed(0)} kB`,
    );
  }

  const body = `// GENERATED by scripts/build-assets.mjs — do not edit by hand.
// Run \`npm run assets\` to regenerate.

export type MediaGroup =
${[...new Set(entries.map((e) => e.group))].map((g) => `  | ${JSON.stringify(g)}`).join("\n")};

export interface MediaAsset {
  readonly id: string;
  readonly group: MediaGroup;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly blurDataURL: string;
  /** Original file in the dunahajok.hu media library. */
  readonly credit: string;
}

export const MEDIA = {
${entries
  .map(
    (e) => `  ${JSON.stringify(e.id)}: {
    id: ${JSON.stringify(e.id)},
    group: ${JSON.stringify(e.group)},
    src: ${JSON.stringify(e.src)},
    width: ${e.width},
    height: ${e.height},
    alt: ${JSON.stringify(e.alt)},
    blurDataURL: ${JSON.stringify(e.blurDataURL)},
    credit: ${JSON.stringify(e.credit)},
  },`,
  )
  .join("\n")}
} as const satisfies Record<string, MediaAsset>;

export type MediaId = keyof typeof MEDIA;
`;

  await writeFile(MANIFEST, body);
  console.log(`\n${entries.length} assets → public/media, manifest → src/lib/media.generated.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
