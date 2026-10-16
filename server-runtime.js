const catalogue=JSON.parse(files['/research.json'].body).entities;
const OWNER_EMAIL='owner@example.com';
function addressKey(address){return String(address||'').normalize('NFKC').toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\b(road|street|avenue|boulevard|crescent|drive|parade|court|victoria)\b/g,x=>({road:'rd',street:'st',avenue:'ave',boulevard:'blvd',crescent:'cres',drive:'dr',parade:'pde',court:'ct',victoria:'vic'})[x]).replace(/\b(australia|vic|\d{4})\b/g,'').replace(/[^a-z0-9]/g,'');}
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 const actor=request.headers.get('oai-authenticated-user-id'),owner=!!actor&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===OWNER_EMAIL;
 if(path.startsWith('/api/commerce')||path==='/api/invoice-file')return commerce(request,env,owner,actor);
 if(path==='/api/maps-config')return json(env.GOOGLE_MAPS_BROWSER_KEY?{apiKey:env.GOOGLE_MAPS_BROWSER_KEY}:{error:'Map key not configured'},env.GOOGLE_MAPS_BROWSER_KEY?200:503);
 if(path==='/api/workspace'){
  try{
   if(!env.DB)return json({error:'Online saving is temporarily unavailable.'},503);
   if(request.method==='GET'){
    const [records,excluded]=await Promise.all([env.DB.prepare('SELECT * FROM lead_state').all(),env.DB.prepare('SELECT key,id,address,reason,created FROM exclusions').all()]);
    const profiles=await env.DB.prepare('SELECT id,data FROM lead_profiles').all();
    return json({authState:owner?'owner':actor?'wrong-account':'anonymous',profiles:profiles.results,canEdit:owner,records:owner?records.results:records.results.map(x=>({id:x.id,level:x.level,status:x.status,follow:x.status==='follow'?1:0,slots:x.slots})),excluded:owner?excluded.results:excluded.results.map(x=>({key:x.key,id:x.id,address:x.address}))});
   }
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(!owner)return json({error:'Sign in with the owner account to edit.'},403);
   if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request origin'},403);
   const raw=await request.text();if(raw.length>18000)return json({error:'Entry too long'},413);
   let b;try{b=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}
   const e=catalogue.find(x=>x.id===b.id);if(!e)return json({error:'Unknown lead'},404);
   const now=new Date().toISOString(),key=addressKey(e.address)||'entity:'+e.id;
   if(b.operation==='exclude'){
    if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>1000)return json({error:'Add an exclusion reason (up to 1,000 characters).'},400);
    await env.DB.batch([env.DB.prepare('INSERT INTO exclusions (key,id,address,reason,created,actor) VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO NOTHING').bind(key,e.id,e.address,b.reason.trim(),now,actor),env.DB.prepare("UPDATE lead_state SET follow=0,status='excluded',updated=?,actor=? WHERE id=?").bind(now,actor,e.id)]);
    return json({ok:true,key});
   }
   const excluded=await env.DB.prepare('SELECT key FROM exclusions WHERE key=? OR id=?').bind(key,e.id).first();if(excluded)return json({error:'This address is permanently excluded.'},409);
   if(b.operation==='status'){
    if(!['new','follow','hold','giveup','client'].includes(b.status))return json({error:'Invalid status'},400);
    if(b.status==='client'&&b.confirmedPaid!==true)return json({error:'请确认已签约并付款 / Confirm signed and paid'},400);
    if(b.status==='client'&&e.role==='Competition reference')return json({error:'Competition references cannot be clients.'},400);
    await env.DB.prepare('INSERT INTO lead_state (id,status,follow,updated,actor) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,follow=excluded.follow,updated=excluded.updated,actor=excluded.actor').bind(e.id,b.status,b.status==='follow'?1:0,now,actor).run();
    return json({ok:true,status:b.status,updated:now});
   }
   if(b.operation==='slots'){
    const record=await env.DB.prepare('SELECT status FROM lead_state WHERE id=?').bind(e.id).first();
    if(record?.status!=='client')return json({error:'Only clients can have recurring slots.'},409);
    const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
    if(!Array.isArray(b.slots)||b.slots.length>30||b.slots.some(s=>!s||!Number.isInteger(s.weekday)||s.weekday<0||s.weekday>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)||s.end<=s.start||!validDate(s.from)||(s.until&&(!validDate(s.until)||s.until<s.from))||!Number.isInteger(s.courts)||s.courts<1||s.courts>100))return json({error:'Check weekday, dates, time range and court count.'},400);
    const slots=b.slots.map(s=>({weekday:s.weekday,start:s.start,end:s.end,from:s.from,until:s.until||'',courts:s.courts}));
    await env.DB.prepare('UPDATE lead_state SET slots=?,updated=?,actor=? WHERE id=?').bind(JSON.stringify(slots),now,actor,e.id).run();
    return json({ok:true,slots,updated:now});
   }
   if(b.operation==='profile'){
    const p=b.profile,keys=['name','address','phone','email','website','summaryZh','summaryEn'];
    if(!p||keys.some(k=>typeof p[k]!=='string'||p[k].length>(k.startsWith('summary')?2500:400))||!p.name.trim()||(p.website&&!/^https?:\/\//.test(p.website))||(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)))return json({error:'Check profile fields'},400);
    await env.DB.prepare('INSERT INTO lead_profiles(id,data,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(e.id,JSON.stringify(Object.fromEntries(keys.map(k=>[k,p[k].trim()]))),now).run();return json({ok:true});
   }
   if(b.operation==='save'){
    if(!Number.isInteger(b.level)||b.level<0||b.level>5||typeof b.note!=='string'||b.note.length>10000||typeof b.follow!=='boolean'||typeof b.action!=='string'||b.action.length>2000)return json({error:'Invalid entry. Notes allow up to 10,000 characters.'},400);
    const prev=await env.DB.prepare('SELECT status FROM lead_state WHERE id=?').bind(e.id).first();const status=['client','hold','giveup'].includes(prev?.status)?prev.status:b.follow?'follow':'new';
    await env.DB.prepare('INSERT INTO lead_state (id,level,note,follow,action,status,updated,actor) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET level=excluded.level,note=excluded.note,follow=excluded.follow,action=excluded.action,status=excluded.status,updated=excluded.updated,actor=excluded.actor').bind(e.id,b.level,b.note,status==='follow'?1:0,b.action,status,now,actor).run();
    return json({ok:true,status,updated:now});
   }
   return json({error:'Unknown operation'},400);
  }catch(error){console.error('Workspace storage failure',error.message);return json({error:'Could not save or load online records. Your input has been kept; please retry.'},503)}
 }
 const f=files[path];return f?new Response(f.binary?Uint8Array.from(atob(f.body),c=>c.charCodeAt(0)):f.body,{headers:{'content-type':f.type,'x-content-type-options':'nosniff','cache-control':'no-cache'}}):new Response('Not found',{status:404});
}};
