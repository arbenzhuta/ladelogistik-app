import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
function strs(d,s,e){const o=[];let c=[],sp=null;for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];const ok=hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo));if(ok){if(c.length===0)sp=i;c.push(String.fromCharCode(lo))}else{if(c.length>=2){o.push({pos:sp-s,t:c.join('')})}c=[];sp=null}}return o}
const secs=fm(data,'./Ablagestruktur')
function secOf(target){for(let s=0;s<secs.length;s++){const e=s+1<secs.length?secs[s+1]:data.length;const ss=strs(data,secs[s],Math.min(e,secs[s]+1500)).map(x=>x.t);if(ss.includes(target))return s}return -1}
for(const tgt of ['1.08_Z_AB17','1.08_Z_AB4','1.07_Z_ZU61']){
  const s=secOf(tgt);const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  console.log('=== '+tgt+' (sec '+s+') strings:')
  const ss=strs(data,start,Math.min(end,start+2600))
  for(const x of ss){if(!/^\.\//.test(x.t))console.log('  @'+x.pos, JSON.stringify(x.t))}
}
