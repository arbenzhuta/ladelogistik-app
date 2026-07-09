import fs from 'fs'
import pako from 'pako'
function load(f){const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}return pako.inflateRaw(raw.slice(z+2))}
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
const files={test123:"/home/ubuntu/test_bogen.MAJ",f30:"/home/ubuntu/attachments/cf6ddce7-7261-4ec4-9c76-5c29c32f351b/26204030.MAJ",f35:"/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ",f59:"/home/ubuntu/attachments/0fa09a30-9d99-498b-aadc-f5f3e13a9af5/26204159.MAJ",f1:"/home/ubuntu/attachments/cf6ddce7-7261-4ec4-9c76-5c29c32f351b/26204030.MAJ"}
for(const [nm,f] of Object.entries(files)){
  let data;try{data=load(f)}catch(e){console.log(nm,'LOAD ERR');continue}
  const u32=(o)=>data[o]|(data[o+1]<<8)|(data[o+2]<<16)|((data[o+3]<<24)>>>0)
  const secs=fm(data,'./Ablagestruktur')
  let out=[]
  for(let s=0;s<secs.length;s++){
    const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
    // strict id>=1000
    let strict=null
    for(let i=start;i<end-20;i++){const id=u32(i); if(id>=1000&&id<2000){const fl=u32(i+4); if((fl===0||fl===1)&&u32(i+8)===1&&u32(i+16)===0){const q=u32(i+12); if(q>0&&q<10000){strict=q;break}}}}
    let loose=null
    for(let i=start;i<end-30;i++){const v=u32(i); if(v===1036||v===1038){const v2=u32(i+4); if(v2===0||v2===1){const q=u32(i+12); if(q>0&&q<10000){loose=q;break}}}}
    let s876=null
    for(let i=start;i<end-16;i++){const v=u32(i); if(v===876){if(u32(i+8)===9){const q=u32(i+12); if(q>0&&q<10000){s876=q;break}}}}
    const combo = strict ?? loose ?? s876 ?? 1
    const old = loose ?? s876 ?? 1
    out.push(old===combo?`${combo}`:`${old}->${combo}`)
  }
  console.log(nm, out.join(' '))
}
