import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>dv.getFloat64(o,true)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
function strs(d,s,e){const o=[];let c=[];for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];if(hi===0&&lo>=0x20&&lo<=0x7e)c.push(String.fromCharCode(lo));else{if(c.length>=2)o.push(c.join(''));c=[]}}return o}
const secs=fm(data,'./Ablagestruktur')
function secOf(t){for(let s=0;s<secs.length;s++){const e=s+1<secs.length?secs[s+1]:data.length;if(strs(data,secs[s],Math.min(e,secs[s]+1500)).includes(t))return s}return -1}
const s=secOf('1.08_Z_ZU15*');const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
console.log('ZU15* section',s,'len',end-start)
let prev=null
for(let o=900;o<=2600;o+=4){const v=rd(start+o);if(v>0&&v<10000&&v===Math.floor(v))console.log(' ',o,v)}
