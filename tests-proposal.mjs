import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from './dist/server/index.js';
const d=JSON.parse(await readFile('dist/research.json','utf8'));
assert.equal(d.entities.length,259);
for(const e of d.entities){assert.ok(e.profile_summary.length>=3);assert.ok(e.profile_summary.every(x=>x.body.zh&&x.body.en));}
const k=d.entities.find(x=>x.id==='school-government-5106');
assert.equal(k.files.length,1);assert.ok(k.approach.email.paragraphs.length>3);assert.ok(k.approach.email.visual.url.endsWith('.jpg'));
for(const url of [k.files[0].url,k.approach.email.visual.url]){const r=await worker.fetch(new Request(url),{});assert.equal(r.status,200);const a=Buffer.from(await r.arrayBuffer());const b=await readFile('dist'+new URL(url).pathname);assert.deepEqual(a,b);}
assert.equal(k.approach.email.links.length,3);
for(const f of ['detail.js','workflow.js'])assert.ok(!(await readFile('dist/'+f,'utf8')).includes('<span class="lang-label">'));
assert.ok(!(await readFile('dist/workflow.js','utf8')).split('function summary')[1].split('function schedules')[0].includes('Potential fit'));
console.log('259 bilingual profiles; Kingswood email links, image, PDF byte integrity and label removal passed.');
