import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/adab23ed-e57b-4961-a888-26ad1dfee917/test+123.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>dv.getFloat64(o,true)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs=fm(data,'./Ablagestruktur')
for(const s of [4,5,6,7]){
  const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  let i=start;const groups=[]
  while(i<end-7){const v=rd(i);if(v!==0&&Math.abs(v)<=10000&&v===Math.floor(v)){const g=[{p:i-start,v}];let j=i+8;while(j<end-7){const n=rd(j);if(n>=-10000&&n<=10000&&n===Math.floor(n)){g.push({p:j-start,v:n});j+=8;if(g.length>=12)break}else break}if(g.length>=2){groups.push(g);i=j}else i+=2}else i+=2}
  console.log('==== SEC',s,'====')
  for(const g of groups.slice(0,12)) console.log('  @'+g[0].p, g.map(x=>x.v).join(','))
}
