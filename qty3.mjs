import fs from 'fs'
import pako from 'pako'
const raw=new Uint8Array(fs.readFileSync("/home/ubuntu/test_bogen.MAJ"));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
const u32=(o)=>data[o]|(data[o+1]<<8)|(data[o+2]<<16)|((data[o+3]<<24)>>>0)
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const secs=fm(data,'./Ablagestruktur')
for(const s of [1,4,5,6,7,10]){
  const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  const found=[]
  for(let i=start;i<end-20;i++){const f=u32(i+4); if((f===0||f===1)&&u32(i+8)===1&&u32(i+16)===0){const q=u32(i+12); if(q>0&&q<10000)found.push(`id=${u32(i)} q=${q}`)}}
  console.log('SEC',s,found.slice(0,6).join('  ')||'none')
}
