async function commerce(request,env,owner,actor){
 const u=new URL(request.url),path=u.pathname;
 if(!owner)return json({error:'请登录管理账户后操作 / Owner sign-in required'},403);
 if(!env.DB)return json({error:'Online storage unavailable'},503);
 const now=new Date().toISOString();
 try{
 if(path==='/api/invoice-file'){
  const inv=await env.DB.prepare('SELECT * FROM invoices WHERE number=?').bind(Number(u.searchParams.get('number'))).first();if(!inv)return json({error:'Invoice not found'},404);
  if(!env.FILES)return json({error:'File storage unavailable'},503);
  const key='invoices/'+inv.number+'.pdf';
  if(request.method==='GET'){const f=await env.FILES.get(key);return f?new Response(f.body,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="RT-'+String(inv.number).padStart(6,'0')+'.pdf"','cache-control':'private, no-store'}}):json({error:'PDF not generated yet'},404);}
  if(request.method!=='POST'||request.headers.get('origin')!==u.origin)return json({error:'Invalid request'},403);
  const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>12000000||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'Invalid PDF'},400);
  if(!await env.FILES.head(key))await env.FILES.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
  return json({ok:true});
 }
 if(request.method==='GET'){
  const id=u.searchParams.get('lead');
  const [settings,orders,payments,invoices]=await Promise.all([env.DB.prepare("SELECT data FROM business_settings WHERE id='invoice'").first(),env.DB.prepare('SELECT * FROM orders WHERE lead_id=? ORDER BY created DESC').bind(id).all(),env.DB.prepare('SELECT p.* FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.lead_id=? ORDER BY p.created DESC').bind(id).all(),env.DB.prepare('SELECT i.* FROM invoices i JOIN orders o ON o.id=i.order_id WHERE o.lead_id=?').bind(id).all()]);
  return json({settings:settings?JSON.parse(settings.data):{},orders:orders.results,payments:payments.results,invoices:invoices.results});
 }
 if(request.method!=='POST'||request.headers.get('origin')!==u.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request'},403);
 const raw=await request.text();if(raw.length>30000)return json({error:'Entry too long'},413);const b=JSON.parse(raw);
 const text=(v,n)=>typeof v==='string'&&v.length<=n;
 if(b.operation==='settings'){
  const v=b.settings,keys=['legalName','abn','address','email','phone','bank','terms','gst'];
  if(!v||keys.some(k=>!text(v[k]||'',k==='bank'||k==='terms'?1500:400))||!['unknown','no','inclusive','exclusive'].includes(v.gst))return json({error:'Check invoice settings'},400);
  const clean=Object.fromEntries(keys.map(k=>[k,(v[k]||'').trim()]));
  await env.DB.prepare("INSERT INTO business_settings(id,data,updated) VALUES('invoice',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated").bind(JSON.stringify(clean),now).run();return json({ok:true});
 }
 if(b.operation==='order'){
  if(!text(b.id,100)||!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>100000000||!text(b.description,2000)||!b.description.trim()||!text(b.notes,5000)||!text(b.buyer,1000)||!b.buyer.trim())return json({error:'请填写金额、内容和客户抬头 / Check order fields'},400);
  const lead=await env.DB.prepare('SELECT status FROM lead_state WHERE id=?').bind(b.leadId).first();if(lead?.status!=='client')return json({error:'Only clients can have orders'},409);
  await env.DB.prepare('INSERT INTO orders(id,lead_id,amount,description,notes,buyer,created,actor) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(b.id,b.leadId,b.amount,b.description.trim(),b.notes,b.buyer.trim(),now,actor).run();return json({ok:true,id:b.id});
 }
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(b.orderId||'').first();if(!order)return json({error:'Order not found'},404);
 if(b.operation==='payment'){
  if(!text(b.id,100)||!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||isNaN(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date||!text(b.reference,500)||!text(b.notes,2000))return json({error:'Check payment amount, date and reference'},400);
  await env.DB.prepare('INSERT INTO payments(id,order_id,amount,date,reference,notes,created,actor) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(b.id,order.id,b.amount,b.date,b.reference,b.notes,now,actor).run();return json({ok:true});
 }
 if(b.operation==='invoice'){
  const prior=await env.DB.prepare('SELECT * FROM invoices WHERE order_id=?').bind(order.id).first();if(prior)return json({ok:true,invoice:prior});
  const row=await env.DB.prepare("SELECT data FROM business_settings WHERE id='invoice'").first(),s=row?JSON.parse(row.data):{};
  if(!s.legalName||!s.address||!/^[0-9]{11}$/.test((s.abn||'').replace(/\s/g,''))||!['no','inclusive','exclusive'].includes(s.gst))return json({error:'请先填写开票主体、ABN、地址及 GST 设置 / Complete invoice settings first'},409);
  const paid=await env.DB.prepare('SELECT COALESCE(SUM(amount),0) AS amount FROM payments WHERE order_id=?').bind(order.id).first();
  const gst=s.gst==='inclusive'?Math.round(order.amount/11):s.gst==='exclusive'?Math.round(order.amount/10):0,total=s.gst==='exclusive'?order.amount+gst:order.amount;
  const invoiceDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(new Date(now));
  const snapshot={seller:s,order,total,gst,subtotal:total-gst,paid:paid.amount,date:invoiceDate};
  await env.DB.prepare('INSERT INTO invoices(order_id,snapshot,created,actor) VALUES(?,?,?,?) ON CONFLICT(order_id) DO NOTHING').bind(order.id,JSON.stringify(snapshot),now,actor).run();
  return json({ok:true,invoice:await env.DB.prepare('SELECT * FROM invoices WHERE order_id=?').bind(order.id).first()});
 }
 return json({error:'Unknown operation'},400);
 }catch(e){console.error('Commerce request failed',e.message);return json({error:'保存失败，请重试 / Could not save, please retry'},500)}
}
