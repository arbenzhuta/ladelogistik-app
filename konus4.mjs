import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/6740e2f3-4c66-4938-b8d1-eb4599259761/test+123.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>dv.getFloat64(o,true)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs=fm(data,'./Ablagestruktur')
for(let s=0;s<secs.length;s++){
  const start=secs[s]
  console.log('===== SEC',s)
  for(let o=1120;o<=1320;o+=4){const v=rd(start+o);if(Number.isFinite(v)&&Math.abs(v)<100000&&Math.abs(v-Math.round(v))<0.01&&v!==0)console.log('  rel@'+o, Math.round(v))}
}
