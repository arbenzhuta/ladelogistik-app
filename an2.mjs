import fs from 'fs'
import pako from 'pako'
const f = '/home/ubuntu/attachments/fbe81395-fed6-4834-bbe6-1049aac9c7be/26203935.MAJ'
const raw = new Uint8Array(fs.readFileSync(f))
let z=-1
for(let i=0;i<100;i++){if(raw[i]===0x78&&raw[i+1]===0x9c){z=i;break}}
const data = pako.inflateRaw(raw.slice(z+2))
console.log('len', data.length)
// list utf16 strings
function strs(d,s,e){const o=[];let c=[],sp=null;for(let i=s;i<e-1;i+=2){const lo=d[i],hi=d[i+1];const ok=hi===0&&((lo>=0x20&&lo<=0x7e)||[0xf8,0xf6,0xfc,0xe4,0xc4,0xd6,0xdc,0xdf].includes(lo));if(ok){if(c.length===0)sp=i;c.push(String.fromCharCode(lo))}else{if(c.length>=2){o.push({pos:sp,text:c.join('')})}c=[];sp=null}}return o}
const all = strs(data,0,data.length)
// Fo positions
const fos = all.filter(s=>/^Fo\d+[A-Za-z*]?$/.test(s.text.trim()))
console.log('Fo count', fos.length, fos.slice(0,40).map(s=>s.text).join(','))
// position entries pattern
const pe = all.filter(s=>/^\d+\.\w+\.\d+(\.\d+)?$/.test(s.text))
console.log('posEntries', pe.length, pe.slice(0,10).map(s=>s.text).join(' | '))
// section markers
const secCount = all.filter(s=>s.text.includes('Ablagestruktur')).length
console.log('Ablage sections', secCount)
// Kanal occurrences
console.log('Kanal str count', all.filter(s=>s.text==='Kanal').length)
console.log('Kanal-cut count', all.filter(s=>s.text.startsWith('Kanal-cut')).length)
