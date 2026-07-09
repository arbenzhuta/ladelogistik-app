import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>{try{return dv.getFloat64(o,true)}catch{return NaN}}
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
function strs(d,s,e){const o=[];let c=[],sp=null;for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];const ok=hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo));if(ok){if(c.length===0)sp=i;c.push(String.fromCharCode(lo))}else{if(c.length>=3){o.push(c.join(''))}c=[];sp=null}}return o}
const secs=fm(data,'./Ablagestruktur')
// find section containing 1.08_Z_AB17
const target='1.08_Z_AB17'
let sIdx=-1
for(let s=0;s<secs.length;s++){const e=s+1<secs.length?secs[s+1]:data.length;const ss=strs(data,secs[s],Math.min(e,secs[s]+1500));if(ss.includes(target)){sIdx=s;break}}
console.log('section',sIdx,'of',secs.length)
const start=secs[sIdx], end=sIdx+1<secs.length?secs[sIdx+1]:data.length
// consecutive double groups
let i=start;const groups=[]
while(i<end-7){const val=rd(i);if(val>0&&val<=10000&&val===Math.floor(val)){const g=[{pos:i,val}];let j=i+8;while(j<end-7){const n=rd(j);if(n>=0&&n<=10000&&n===Math.floor(n)){g.push({pos:j,val:n});j+=8;if(g.length>=4)break}else break}if(g.length>=2)groups.push(g);i=j}else i+=2}
console.log('groups:')
for(const g of groups)console.log('  @'+(g[0].pos-start),g.map(x=>x.val).join(','))
