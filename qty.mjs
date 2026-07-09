import fs from 'fs'
import pako from 'pako'
const raw=new Uint8Array(fs.readFileSync("/home/ubuntu/test_bogen.MAJ"));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const u32=(o)=>data[o]|(data[o+1]<<8)|(data[o+2]<<16)|((data[o+3]<<24)>>>0)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs=fm(data,'./Ablagestruktur')
for(let s=0;s<secs.length;s++){
  const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  const hits=[]
  for(let i=start;i<end-30;i++){const v=u32(i); if(v===1036||v===1038){const v2=u32(i+4); if(v2===0||v2===1){hits.push(`${v}/f${v2}=>${u32(i+12)}`)}}}
  // 876
  const h876=[]
  for(let i=start;i<end-16;i++){const v=u32(i); if(v===876){const v3=u32(i+8); if(v3===9)h876.push(u32(i+12))}}
  console.log('SEC',s,'1036/1038:',hits.join(' ')||'-', '| 876:',h876.join(' ')||'-')
}
