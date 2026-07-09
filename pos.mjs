import fs from 'fs'
import pako from 'pako'
function load(f){const raw=new Uint8Array(fs.readFileSync(f));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}return pako.inflateRaw(raw.slice(z+2))}
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
// read strings min len 1 in window, return all
function rstr(d,s,e){const o=[];let c=[];for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];if(hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo))){c.push(String.fromCharCode(lo))}else{if(c.length>=1)o.push(c.join(''));c=[]}}if(c.length>=1)o.push(c.join(''));return o}
function firstNum(d,s,e){const arr=rstr(d,s,Math.min(e,s+300));for(const t of arr){if(/^\d{1,4}$/.test(t))return t}return ''}
const files={test123:"/home/ubuntu/test_bogen.MAJ",f30:"/home/ubuntu/attachments/cf6ddce7-7261-4ec4-9c76-5c29c32f351b/26204030.MAJ",f35:"/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ",f59:"/home/ubuntu/attachments/0fa09a30-9d99-498b-aadc-f5f3e13a9af5/26204159.MAJ"}
for(const [nm,f] of Object.entries(files)){
  const data=load(f); const secs=fm(data,'./Ablagestruktur')
  let out=[]
  for(let s=0;s<secs.length;s++){const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length; out.push(firstNum(data,start,end)||'-')}
  console.log(nm, out.join(' '))
}
