/* Canvas-backed PDF preserves bilingual text without downloading fonts. */
const RTInvoice=(()=>{
 const money=n=>'AUD '+(n/100).toFixed(2);
 function pack(images,w,h){const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;const put=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);length+=b.length};const obj=(n,body)=>{offsets[n]=length;put(n+' 0 obj\n');body();put('\nendobj\n')};put('%PDF-1.4\n');obj(1,()=>put('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>put('<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
 images.forEach((jpg,i)=>{let n=3+i*3;obj(n,()=>put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im '+(n+1)+' 0 R >> >> /Contents '+(n+2)+' 0 R >>'));obj(n+1,()=>{put('<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');put(jpg);put('\nendstream')});const stream='q 595.28 0 0 841.89 0 0 cm /Im Do Q';obj(n+2,()=>put('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'\nendstream'))});const start=length;put('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');for(const o of offsets.slice(1))put(String(o).padStart(10,'0')+' 00000 n \n');put('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');return new Blob(parts,{type:'application/pdf'})}
 async function create(s,number,options={}){
  let logo=options.logo;if(!logo&&typeof Image!=='undefined'){logo=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src='/assets/rt-badminton-logo.png'});}
  const make=options.canvas||(()=>document.createElement('canvas')),W=1190,H=1684,pages=[];let c,ctx,y;
  const title=number?(s.seller.gst==='no'?'INVOICE':'TAX INVOICE'):'DRAFT / SAMPLE';
  const text=(t,x,yy,size=22,color='#143d33',bold=false)=>{ctx.fillStyle=color;ctx.font=(bold?'600 ':'')+size+'px Arial, "PingFang SC", sans-serif';ctx.fillText(String(t||''),x,yy)};
  function page(){c=make();c.width=W;c.height=H;ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#01AB81';ctx.fillRect(0,0,W,160);if(logo)ctx.drawImage(logo,55,20,350,126);else{text('Rainbow',64,80,46,'#fff',true);text('Badminton & Pickleball',66,123,24,'#fff');}text(title,690,85,30,'#fff',true);text(number?'RT-'+String(number).padStart(6,'0'):'NOT FOR PAYMENT',690,125,22,'#fff');y=215;}
  function finish(){text('Rainbow Town  |  '+(number?'RT-'+String(number).padStart(6,'0'):'Sample only')+'  |  '+(pages.length+1),64,H-48,17,'#557269');const b64=c.toDataURL('image/jpeg',.94).split(',')[1];pages.push(Uint8Array.from(atob(b64),x=>x.charCodeAt(0)));}
  function line(t,size=22,bold=false,color='#143d33'){if(y>H-105){finish();page()}text(t,64,y,size,color,bold);y+=size*1.55}
  function para(str,size=22){ctx.font=size+'px Arial, "PingFang SC", sans-serif';for(const p of String(str||'').split('\n')){let row='';for(const ch of p){if(ctx.measureText(row+ch).width>1055){line(row,size);row=ch} else row+=ch}line(row,size)}}
  const heading=t=>{y+=24;line(t,22,true);y+=8};page();
  para(s.seller.legalName||'Business legal name to be supplied',28);para('ABN: '+(s.seller.abn||'To be supplied'),20);para(s.seller.address||'Business address to be supplied',20);para([s.seller.email,s.seller.phone].filter(Boolean).join('  |  '),20);
  heading('BILL TO');para(s.order.buyer||'Client name / 客户抬头');line('Issue date: '+s.date,20);heading('DESCRIPTION');para(s.order.description||'Court booking / 场地预订');
  line('Quantity: 1 booking / service',20);heading('AMOUNT');line('Subtotal: '+money(s.subtotal),24);line('GST: '+money(s.gst)+(s.seller.gst==='no'?' (not registered)':''),22);line('Total: '+money(s.total),30,true);line('Payments recorded at issue: '+money(s.paid||0),22);line(((s.paid||0)>s.total?'Credit at issue: ':'Balance at issue: ')+money(Math.abs(s.total-(s.paid||0))),24,true);
  if(s.seller.bank){heading('PAYMENT DETAILS');para(s.seller.bank,20)}if(s.seller.terms){heading('TERMS');para(s.seller.terms,20)}
  if(!number){heading('SAMPLE ONLY / 模板预览');para('Complete issuer details and GST settings before issuing. / 正式开票前请补全主体与 GST 信息。',20)}
  finish();return pack(pages,W,H);
 }
 return {create,money};
})();
