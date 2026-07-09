import { parseMAJFile } from './src/utils/majParser.js'
import fs from 'fs'
const files={
 '26203935':'/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ',
 '26204030':'/home/ubuntu/attachments/cf6ddce7-7261-4ec4-9c76-5c29c32f351b/26204030.MAJ',
 '26204159':'/home/ubuntu/attachments/0fa09a30-9d99-498b-aadc-f5f3e13a9af5/26204159.MAJ',
}
for(const [k,p] of Object.entries(files)){
  if(!fs.existsSync(p)){console.log(k,'MISSING');continue}
  const buf=new Uint8Array(fs.readFileSync(p))
  let r
  try{r=parseMAJFile(buf)}catch(e){console.log(k,'ERR',e.message);continue}
  const arr=r.frachtstuecke||r
  console.log('===',k,'count',arr.length,'total',arr.reduce((s,a)=>s+a.anzahl,0))
  for(const a of arr) console.log('  ',a.pos||'-', a.name, a.a+'x'+a.b+'xL'+a.L, 'Stk',a.anzahl)
}
