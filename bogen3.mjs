import fs from 'fs'
import pako from 'pako'
const f='/home/ubuntu/attachments/adab23ed-e57b-4961-a888-26ad1dfee917/test+123.MAJ'
const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const dv=new DataView(data.buffer,data.byteOffset,data.byteLength)
const rd=(o)=>dv.getFloat64(o,true)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs=fm(data,'./Ablagestruktur')
const off={4:1014,5:1014,6:1054,7:1054}
for(const s of [4,5,6,7]){
  const start=secs[s]
  const vals=[]
  for(let k=0;k<14;k++){vals.push(Math.round(rd(start+off[s]+k*8)))}
  console.log('SEC',s,'Abm:',vals.map((v,i)=>`#${i+1}=${v}`).join(' '))
}
