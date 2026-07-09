import fs from 'fs'
import pako from 'pako'
const f = '/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ'
const raw = new Uint8Array(fs.readFileSync(f))
let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data = pako.inflateRaw(raw.slice(z+2))
const u32=(d,o)=>(d[o]|(d[o+1]<<8)|(d[o+2]<<16)|((d[o+3]<<24)>>>0))
function strs(d,s,e){const o=[];let c=[],sp=null;for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];const ok=hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo));if(ok){if(c.length===0)sp=i;c.push(String.fromCharCode(lo))}else{if(c.length>=1){o.push({pos:sp,text:c.join('')})}c=[];sp=null}}return o}
function findMarker(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs = findMarker(data,'./Ablagestruktur')
for(let s=0;s<secs.length;s++){
  const start=secs[s], end=s+1<secs.length?secs[s+1]:data.length
  const ss = strs(data,start,Math.min(end,start+900)).map(x=>x.text)
  const desc = ss.find(t=>!t.startsWith('./')&&t.length>=3&&!/^\d+\.\d+_/.test(t)) || ''
  if(!/^Kanal/.test(desc)) continue
  // find all 1036/1038 markers and their value at +12
  const m=[]
  for(let i=start;i<end-30;i++){const v=u32(data,i);if(v===1036||v===1038){const f4=u32(data,i+4);const q=u32(data,i+12);m.push(v+':f4='+f4+':q='+q)}}
  const m876=[]
  for(let i=start;i<end-16;i++){const v=u32(data,i);if(v===876){const v3=u32(data,i+8);const q=u32(data,i+12);m876.push('876:v3='+v3+':q='+q)}}
  console.log(s,desc.slice(0,12),'| 1036/8:['+m.slice(0,4).join(' ')+'] | 876:['+m876.slice(0,3).join(' ')+']')
}
