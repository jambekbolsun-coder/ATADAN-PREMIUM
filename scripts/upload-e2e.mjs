import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const {actors}=JSON.parse(fs.readFileSync('../atadan-test-context.json','utf8'));
const base='http://localhost:3022';
const uploads=[];
const fixtures=[['QA-image.png','image/png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9kAAAAASUVORK5CYII=','base64')],['QA-document.pdf','application/pdf',Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')],['QA-audio.webm','audio/webm',Buffer.from([0x1a,0x45,0xdf,0xa3])]];
for(const [name,type,bytes] of fixtures){
 const form=new FormData();form.set('file',new File([bytes],name,{type}));form.set('visibility','private');form.set('scope','chat');
 const response=await fetch(base+'/api/admin/media',{method:'POST',headers:{Cookie:`atadan_staff=${actors[0].token}`,Origin:base},body:form});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));uploads.push({name,type,url:data.url,size:bytes.length});
}
fs.writeFileSync('../atadan-test-uploads.json',JSON.stringify(uploads));
const response=await fetch(base+'/api/admin/collaboration',{method:'POST',headers:{Cookie:`atadan_staff=${actors[0].token}`,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'send_message',to:actors[1].id,text:'Фото, документ и голосовое',attachments:uploads,clientId:crypto.randomUUID()})});assert.equal(response.status,201,await response.text());
for(const file of uploads){
 const recipient=await fetch(base+file.url,{headers:{Cookie:`atadan_staff=${actors[1].token}`}});assert.equal(recipient.status,200,`${file.name}: recipient`);
 const outsider=await fetch(base+file.url,{headers:{Cookie:`atadan_staff=${actors[2].token}`}});assert.equal(outsider.status,403,`${file.name}: outsider`);
 const anonymous=await fetch(base+file.url);assert.equal(anonymous.status,401,`${file.name}: anonymous`);
}
console.log('PASS: image, PDF and audio upload; recipient access; outsider and anonymous access denied.');
