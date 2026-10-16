const fs=require('fs');
const data=JSON.parse(fs.readFileSync('intelligence/venue-demand-leads.json','utf8'));
const photos=fs.existsSync('intelligence/photo-research.json')?JSON.parse(fs.readFileSync('intelligence/photo-research.json','utf8')):{};
const analysis=fs.existsSync('intelligence/analysis-20260914.json')?JSON.parse(fs.readFileSync('intelligence/analysis-20260914.json','utf8')):{};
const approaches=JSON.parse(fs.readFileSync('intelligence/approach-20260914.json','utf8'));
const attachments=JSON.parse(fs.readFileSync('intelligence/files.json','utf8'));
for(const e of data.entities){e.photos=photos[e.id]||[];e.analysis=analysis[e.id]||null;e.approach=approaches[e.id]||null;e.files=attachments[e.id]||e.files||[];}
fs.writeFileSync('dist/research.json',JSON.stringify(data));
const files={};for(const f of ['index.html','style.css','app.js','map.js','crm.js','workspace.js','photos.js','detail.js','workflow.js','sales.js','invoice.js','research.json'])files['/'+f]={body:fs.readFileSync('dist/'+f,'utf8'),type:({'html':'text/html','css':'text/css','js':'text/javascript','json':'application/json'})[f.split('.').pop()]+'; charset=utf-8'};
for(const f of fs.readdirSync('dist/assets')){const ext=f.split('.').pop();files['/assets/'+f]={body:fs.readFileSync('dist/assets/'+f).toString('base64'),binary:true,type:({pdf:'application/pdf',jpg:'image/jpeg',png:'image/png'})[ext]||'application/octet-stream'};}
files['/']=files['/index.html'];fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js','const files='+JSON.stringify(files)+';'+fs.readFileSync('commerce-runtime.js','utf8')+fs.readFileSync('server-runtime.js','utf8'));
console.log('Built '+data.entities.length+' research objects from the canonical dataset.');

fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');if(fs.existsSync('drizzle'))fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
