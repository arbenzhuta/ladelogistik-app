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
  const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  // find group start (first int double >=50 with chain >=5)
  let gi=-1
  for(let i=start;i<end-7;i+=2){const v=rd(i);if(v>=50&&v<=10000&&v===Math.floor(v)){const a=rd(i+8),b=rd(i+16);if(a>=50&&b>=50){gi=i;break}}}
  console.log('SEC',s,'group@rel',gi-start)
  const vals=[]
  for(let k=0;k<14;k++){vals.push(Math.round(rd(gi+k*8)))}
  console.log('  16 consec:',vals.join(','))
}
