import sharp from "sharp";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const WINDOW = { left: 1464, top: 1719, width: 152, height: 32 };
const ZOOM = 8;
const { data, info } = await sharp(path.join(ROOT, "assets/source/pxl/pxl-colours-04.jpg"))
  .extract(WINDOW).resize({ width: WINDOW.width * ZOOM, kernel: "lanczos3" })
  .blur(1.2).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const tiles = [];
for (const [T, SKYF] of [[40,0],[46,0],[52,0],[46,0.10],[52,0.10]]) {
  const SKY = Math.round(H*SKYF);
  const rgb = Buffer.alloc(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;
    const l=0.2126*data[i*C]+0.7152*data[i*C+1]+0.0722*data[i*C+2];
    const on = y>=SKY && l>T; rgb[i*3]=on?255:0;rgb[i*3+1]=on?255:0;rgb[i*3+2]=on?255:0;}
  tiles.push({input: await sharp(rgb,{raw:{width:W,height:H,channels:3}}).png().toBuffer(), top: tiles.length*(H+8), left:0});
}
await sharp({create:{width:W,height:tiles.length*(H+8),channels:3,background:{r:40,g:0,b:0}}})
  .composite(tiles).png().toFile(path.join(ROOT,".qa/duna-mask.png"));
console.log(`${W}x${H}; rows: T=40 sky0, T=46 sky0, T=52 sky0, T=46 sky10%, T=52 sky10%`);
