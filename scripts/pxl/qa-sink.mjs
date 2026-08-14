/**
 * PXL — a place for rendered frames to land.  PHASE 4.3.
 *
 *     node scripts/pxl/qa-sink.mjs [port]
 *
 * `window.__pxlQa.capture()` hands back a data URL, and a data URL is not a
 * file. Every earlier phase closed that gap by hand — read the string out of a
 * console, paste it somewhere, decode it — which is fine for one frame and is
 * not fine for the ninety-odd this phase renders while iterating on geometry.
 *
 * So: a two-route HTTP server, CORS-open on localhost, that writes whatever is
 * posted to it into `.qa/`. The page fetches it; node writes the PNG. Nothing
 * about it touches the Next build, the production bundle or the exported site —
 * it is a separate process that exists only while somebody is looking at the
 * boat.
 *
 *   POST /frame   { name, dataUrl }   →  .qa/<name>.png
 *   POST /json    { name, data }      →  .qa/<name>.json
 *   GET  /ping                        →  ok
 *
 * `name` is sanitised to `[A-Za-z0-9._-]` and flattened, so a posted name can
 * only ever produce a file directly inside `.qa/`.
 */

import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, ".qa");
const PORT = Number(process.argv[2] ?? 7788);

mkdirSync(OUT, { recursive: true });

/** Flatten to a leaf name. A posted name cannot escape `.qa/`. */
function safe(name) {
  return String(name ?? "frame").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
}

function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  if (req.url === "/ping") return res.writeHead(200).end("ok");

  try {
    const payload = JSON.parse(await body(req));
    if (req.url === "/frame") {
      const b64 = String(payload.dataUrl).split(",")[1] ?? "";
      const file = path.join(OUT, `${safe(payload.name)}.png`);
      writeFileSync(file, Buffer.from(b64, "base64"));
      console.log(`  ${path.relative(ROOT, file)}  ${(b64.length * 0.75 / 1024).toFixed(0)} KB`);
      return res.writeHead(200).end("ok");
    }
    if (req.url === "/json") {
      const file = path.join(OUT, `${safe(payload.name)}.json`);
      writeFileSync(file, JSON.stringify(payload.data, null, 2));
      console.log(`  ${path.relative(ROOT, file)}`);
      return res.writeHead(200).end("ok");
    }
    res.writeHead(404).end("no");
  } catch (err) {
    console.error("  sink error:", err.message);
    res.writeHead(500).end(String(err.message));
  }
});

server.listen(PORT, () => console.log(`  qa sink on http://localhost:${PORT}`));
