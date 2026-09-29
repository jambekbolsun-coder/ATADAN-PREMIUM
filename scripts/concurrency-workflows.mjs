import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import pg from 'pg';import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const {actors,schema}=JSON.parse(fs.readFileSync('../atadan-test-context.json','utf8'));
const url=new URL(process.env.DATABASE_URL);assert.equal(url.searchParams.get('options'),`-c search_path=${schema}`);const ssl=url.searchParams.get('sslmode');url.searchParams.delete('sslmode');
const pool=new pg.Pool({connectionString:url.toString(),ssl:ssl?{rejectUnauthorized:true}:undefined,max:2});
const base='http://localhost:3022';
async function post(path,body,extra={}){const r=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:`atadan_staff=${actors[0].token}`,...extra},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
try{
 await pool.query('DELETE FROM request_limits');
 const key=crypto.randomUUID(),lead={name:'Параллельный тест',phone:'+996707334455',consent:true,consentVersion:'2026-09',consentedAt:new Date().toISOString(),sourcePath:'/catalog',region:'Чуйская область'};
 const leads=await Promise.all(Array.from({length:6},()=>post('/api/leads',lead,{'Idempotency-Key':key,'x-forwarded-for':'198.51.100.209'})));
 assert.ok(leads.every(r=>[200,201].includes(r.status)),JSON.stringify(leads));assert.equal(new Set(leads.map(r=>r.body.id)).size,1);assert.equal(leads.filter(r=>r.status===201).length,1);
 console.log('PASS: six concurrent submissions create exactly one lead and deal');
 const group=await post('/api/admin/collaboration',{action:'create_group',title:'Concurrent QA',members:['test-manager']});assert.equal(group.status,201);
 const message={action:'send_message',groupId:group.body.id,text:'Одновременное повторение',clientId:crypto.randomUUID()};
 const messages=await Promise.all(Array.from({length:8},()=>post('/api/admin/collaboration',message)));assert.ok(messages.every(r=>r.status===201),JSON.stringify(messages));const count=await pool.query('SELECT COUNT(*) n FROM messages_v2 WHERE id=$1',[message.clientId]);assert.equal(Number(count.rows[0].n),1);console.log('PASS: eight concurrent chat retries create one message');
 const conflict=await post('/api/admin/collaboration',{...message,text:'Другой текст'});assert.equal(conflict.status,409);
 const reads=await Promise.all(Array.from({length:12},()=>fetch(base+'/api/admin/collaboration?scope=chat&target=test-manager',{headers:{Cookie:`atadan_staff=${actors[0].token}`}})));assert.ok(reads.every(r=>r.status===200));console.log('PASS: twelve simultaneous dialog reads complete successfully');
 for(const [name,type,bytes,expected] of [['bad.exe','application/octet-stream',Buffer.from('invalid'),415],['large.png','image/png',Buffer.alloc(4_010_000),413]]){const form=new FormData();form.set('file',new File([bytes],name,{type}));form.set('visibility','private');form.set('scope','chat');const r=await fetch(base+'/api/admin/media',{method:'POST',headers:{Cookie:`atadan_staff=${actors[0].token}`,Origin:base},body:form});assert.equal(r.status,expected)}
 const csrf=await post('/api/admin/collaboration',{action:'send_message',to:'test-manager',text:'Forbidden'},{Origin:'https://external.example'});assert.equal(csrf.status,403);
 const invalid=await post('/api/admin/record-options',{kind:'unknown',action:'add_choice',field:'expenseCategory',value:'x'});assert.equal(invalid.status,400);console.log('PASS: oversized and unsupported files, foreign origin and unknown category scope rejected');
 console.log('CONCURRENCY AND FAILURE CHECKS PASSED');
}finally{await pool.end()}
