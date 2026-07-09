import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/6740e2f3-4c66-4938-b8d1-eb4599259761/test+123.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>dv.getFloat64(o,true)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
function strs(d,s,e){const o=[];let c=[],sp=null;for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];if(hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo))){if(c.length===0)sp=i;c.push(String.fromCharCode(lo))}else{if(c.length>=2)o.push({p:sp-s,t:c.join('')});c=[];sp=null}}return o}
const secs=fm(data,'./Ablagestruktur')
for(let s=0;s<secs.length;s++){
  const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  console.log('========= SECTION',s,'=========')
  console.log('strings:')
  for(const x of strs(data,start,Math.min(end,start+2600))) if(!x.t.startsWith('./')) console.log('  @'+x.p, JSON.stringify(x.t))
  // aligned integer doubles in first 2600 bytes
  const ints=[]
  for(let o=300;o<=2600;o+=4){const v=rd(start+o);if(v!==0&&Math.abs(v)<10000&&v===Math.floor(v))ints.push(o+':'+v)}
  console.log('int-doubles:', ints.join('  '))
}
