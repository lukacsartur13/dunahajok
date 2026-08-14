import sharp from "sharp";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
async function sample(file, box, thresh) {
  const { data, info } = await sharp(path.join(ROOT, file)).extract(box).raw().toBuffer({resolveWithObject:true});
  const C=info.channels; const px=[];
  for (let i=0;i<info.width*info.height;i++){
    const r=data[i*C],g=data[i*C+1],b=data[i*C+2];
    px.push([0.2126*r+0.7152*g+0.0722*b, r,g,b]);
  }
  px.sort((a,b)=>b[0]-a[0]);
  const top = px.slice(0, Math.max(6, Math.round(px.length*thresh)));
  const bot = px.slice(-Math.round(px.length*0.35));
  const avg = (a)=>[1,2,3].map(k=>Math.round(a.reduce((s,p)=>s+p[k],0)/a.length));
  const hex = (c)=>"#"+c.map(v=>v.toString(16).padStart(2,"0")).join("");
  console.log(`${file} ${JSON.stringify(box)}`);
  console.log(`  ink    ${hex(avg(top))}  lum ${(top.reduce((s,p)=>s+p[0],0)/top.length).toFixed(1)}`);
  console.log(`  ground ${hex(avg(bot))}  lum ${(bot.reduce((s,p)=>s+p[0],0)/bot.length).toFixed(1)}`);
}
// Duna script in the side plate and in the navy water study
await sample("assets/source/pxl/pxl-side-20240719.jpg", {left:1608,top:838,width:138,height:24}, 0.12);
await sample("assets/source/pxl/pxl-colours-04.jpg", {left:1466,top:1722,width:148,height:26}, 0.12);
// The plexi PXL in a water study
await sample("assets/source/pxl/pxl-colours-02.jpg", {left:1620,top:430,width:130,height:60}, 0.10);
