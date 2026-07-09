import fs from 'fs'
import pako from 'pako'
const raw=new Uint8Array(fs.readFileSync("/home/ubuntu/test_au.MAJ"));let z=-1;for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data=pako.inflateRaw(raw.slice(z+2))
function fm(d,str){const sb=new Uint8Array(str.length*2);for(let i=0;i<str.length;i++){sb[i*2]=str.charCodeAt(i)}const r=[];for(let i=0;i<d.length-sb.length;i+=2){let m=true;for(let j=0;j<sb.length;j++){if(d[i+j]!==sb[j]){m=false;break}}if(m)r.push(i)}return r}
function rstr(d,s,e){const o=[];let c=[];for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];if(hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo))){c.push(String.fromCharCode(lo))}else{if(c.length>=2)o.push(c.join(''));c=[]}}return o}
const secs=fm(data,'./Ablagestruktur')
for(let s=0;s<secs.length;s++){const start=secs[s],end=s+1<secs.length?secs[s+1]:data.length
  const all=rstr(data,start,Math.min(end,start+260)).filter(x=>!x.startsWith('./')&&!/\.png|\.PNG/i.test(x))
  console.log('SEC',s,all.slice(0,6).join(' | '))
}
