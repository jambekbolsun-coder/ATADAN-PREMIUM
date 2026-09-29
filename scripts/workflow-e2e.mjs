import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const context=JSON.parse(fs.readFileSync('../atadan-test-context.json','utf8'));
const connection=new URL(process.env.DATABASE_URL);assert.equal(connection.searchParams.get('options'),`-c search_path=${context.schema}`,'Only isolated test schema is allowed');
const ssl=connection.searchParams.get('sslmode');connection.searchParams.delete('sslmode');
const pool=new pg.Pool({connectionString:connection.toString(),ssl:ssl&&ssl!=='disable'?{rejectUnauthorized:true}:undefined,max:2});
const base='http://localhost:3022',actors=context.actors;
let checks=0;
const log=name=>{checks++;console.log(`PASS ${checks}: ${name}`)};
async function req(path,{body,actor=actors[0],status=200,headers={},method}={}){
 const response=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(actor?{Cookie:`atadan_staff=${actor.token}`} :{}),...(body?{'Content-Type':'application/json',Origin:base}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const type=response.headers.get('content-type')||'',data=type.includes('json')?await response.json():await response.text();
 assert.equal(response.status,status,`${path} ${JSON.stringify(body?.action)}: ${JSON.stringify(data).slice(0,600)}`);return data;
}
const post=(path,body,status=200,actor)=>req(path,{body,status,actor});
const record=(kind,data={},title=`QA ${kind}`)=>post('/api/admin/records',{kind,action:'create',title,subtitle:'Изолированный тест',status:'active',data},201);
try{
 await pool.query('DELETE FROM request_limits');
 await req('/api/admin/dashboard',{actor:null,status:401});log('Admin endpoints require authentication');
 const catalog=await req('/api/catalog',{actor:null});const products=Array.isArray(catalog)?catalog:catalog.tractors||catalog.catalog;assert.ok(products?.length);const product=products.find(p=>p.price>0)||products[0];
 const phones=['+996700112233','+79161234567','+77011234567','+998901234567','+992901234567'];
 for(const [index,phone] of phones.entries()){
   const key=crypto.randomUUID(),payload={name:`Тест ${index}`,phone,tractorSlug:product.slug,consent:true,consentVersion:'2026-09-09',consentedAt:new Date().toISOString(),sourcePath:'/catalog/'+product.slug,region:'Ошская область',message:'Тестовая заявка'};
   const created=await req('/api/leads',{actor:null,status:201,body:payload,headers:{'Idempotency-Key':key,'x-forwarded-for':`198.51.100.${10+index}`}});
   assert.ok(created.id);const repeated=await req('/api/leads',{actor:null,status:200,body:payload,headers:{'Idempotency-Key':key,'x-forwarded-for':`198.51.100.${10+index}`}});assert.equal(created.id,repeated.id);
 }
 log('All five country numbers accepted; repeated requests create no duplicate lead');
 await req('/api/leads',{actor:null,status:400,body:{name:'Test',phone:'+99612',consent:true}});log('Invalid phone rejected');
 const customer=await pool.query("SELECT id,region FROM crm_customers WHERE normalized_phone='996700112233'");assert.equal(customer.rows[0].region,'Ошская область');log('Selected region saved in client record');
 const deal=(await record('inventory_units',{vin:`ZA${Date.now()}`,model:product.model,tractorSlug:product.slug,unitStatus:'На складе',purchaseCost:'100',salePrice:'200',expenses:'0'}));
 const inventoryId=deal.id;
 const sale=await post('/api/admin/crm',{action:'create_deal',title:'QA pipeline',name:'Клиент воронки',phone:'+996700112244',amount:500000,tractorSlug:product.slug,assignedTo:'test-owner'},201);
 async function move(stage){const data=await req('/api/admin/crm?mode=deals');const row=data.deals.find(d=>d.id===sale.id);return post('/api/admin/crm',{action:'move_deal',id:row.id,version:row.version,stage})}
 await move('meeting');await move('meeting_done');await move('meeting_done');
 const meetings=await pool.query('SELECT * FROM meetings_v2 WHERE deal_id=$1',[sale.id]);assert.equal(meetings.rowCount,1);assert.equal(meetings.rows[0].status,'closed');
 const meetingCards=await req('/api/admin/records?kind=meetings');assert.ok(meetingCards.records.some(r=>r.id===meetings.rows[0].id&&r.status==='closed'));log('Pipeline creates and completes one linked meeting without duplicates');
 const shipment=await record('shipments',{company:'QA carrier',driverName:'Тест Водитель',driverPhone:'+996700000001',companyPhone:'+996700000002',dateFrom:'2026-09-22',eta:'2026-09-25',shipmentCategory:'Внешняя',cargo:'Трактор',reports:''});assert.ok(shipment.id);
 await post('/api/admin/records',{kind:'shipments',action:'create',title:'Bad dates',data:{dateFrom:'2026-09-25',eta:'2026-09-22'}},400);log('Shipment saves without purchase order; reversed dates rejected');
 const folderData=await req('/api/admin/record-options?kind=documents');assert.equal(folderData.folders.length,3);const folder=folderData.folders[0];
 await post('/api/admin/record-options',{kind:'documents',action:'rename_folder',id:folder.id,version:folder.version,name:'Импорт 2026'});
 await post('/api/admin/record-options',{kind:'documents',action:'rename_folder',id:folder.id,version:folder.version,name:'Устаревшая правка'},409);
 await post('/api/admin/record-options',{kind:'documents',action:'add_choice',field:'documentType',value:'Документ клиента'});
 const document=await record('documents',{folderId:folder.id,date:'2026-09-22',importType:'Импорт 40',documentType:'Документ клиента',fileUrl:'https://example.test/report.pdf'});assert.ok(document.id);
 const filtered=await req(`/api/admin/records?kind=documents&folder=${folder.id}`);assert.ok(filtered.records.some(r=>r.id===document.id));log('Three folders, rename conflict protection, custom document type and folder filter');
 const service=await record('service_cases',{company:'QA',serviceCategory:'Негарантийный случай',clientName:'Клиент сервиса',clientPhone:'+998901234568',date:'2026-09-22',motoHours:'500',inventoryUnitId:inventoryId,issue:'Плановое обслуживание'});assert.ok(service.id);log('Service links warehouse tractor and creates a client without requiring an existing sale');
 await post('/api/admin/record-options',{kind:'finance_entries',action:'add_choice',field:'expenseCategory',value:'Командировка'});
 const expense=await record('finance_entries',{expenseCategory:'Командировка',date:'2026-09-22',counterparty:'Тестовый сотрудник',amount:'1500'});assert.ok(expense.id);
 const transaction=await pool.query('SELECT * FROM account_transactions WHERE expense_record_id=$1',[expense.id]);assert.equal(Number(transaction.rows[0].amount_minor),150000);log('Simplified expense posts actual amount with internal accounting link');
 await pool.query("UPDATE staff SET permissions_json=$1 WHERE id IN ('test-manager','test-other')",[JSON.stringify(['chat','groups','notifications','documents','service-cases','deals','client-base'])]);
 const msgId=crypto.randomUUID(),msg={action:'send_message',to:'test-manager',text:'Привет, команда!',attachments:[],clientId:msgId};
 await post('/api/admin/collaboration',msg,201);await post('/api/admin/collaboration',msg,201);
 const inbox=await req('/api/admin/collaboration?scope=chat',{actor:actors[1]});assert.equal(inbox.messages.filter(m=>m.id===msgId).length,1);
 const outsider=await req('/api/admin/collaboration?scope=chat',{actor:actors[2]});assert.ok(!outsider.messages.some(m=>m.id===msgId));log('Direct messaging, retry deduplication and isolation between employees');
 const group=await post('/api/admin/collaboration',{action:'create_group',title:'QA группа',description:'Описание',members:['test-manager']},201);
 await post('/api/admin/collaboration',{action:'send_message',groupId:group.id,text:'Групповое сообщение',attachments:[],clientId:crypto.randomUUID()},201,actors[1]);
 await post('/api/admin/collaboration',{action:'send_message',groupId:group.id,text:'Недопустимо',clientId:crypto.randomUUID()},403,actors[2]);
 await post('/api/admin/collaboration',{action:'send_message',to:'test-manager',text:'',attachments:[]},400);
 await post('/api/admin/collaboration',{action:'send_message',to:'test-manager',text:'',attachments:[{url:'/api/admin/media?key=admin-private/fake/file.pdf',name:'x'}]},403);log('Group members can chat; outsiders, empty messages and foreign files rejected');
 await req('/api/events',{actor:null,status:204,body:{path:`/catalog/${product.slug}`,tractorSlug:product.slug,eventType:'page_view',visitorId:crypto.randomUUID(),region:'Ошская область'}});
 const dashboard=await req('/api/admin/dashboard');assert.ok(dashboard.director.modelRegions.some(r=>r.tractor_slug===product.slug&&r.region==='Ошская область'&&r.views>0));log('Model analytics aggregates recorded region');
 const faq=await req('/api/admin/records?kind=faq');assert.ok(faq.records.length>=5);log('New FAQ entries are editable in admin');
 {const lease={name:'Клиент лизинга',phone:'+996700112255',city:'Ош',consent:true,tractorSlug:product.slug,programId:'default',estimatedPrice:2500000,downMode:'percent',downValue:30,months:84,options:[]};
  await req('/api/leasing-applications',{actor:null,status:201,body:lease,headers:{'Idempotency-Key':crypto.randomUUID(),'x-forwarded-for':'198.51.100.99'}});
  await req('/api/leasing-applications',{actor:null,status:400,body:{...lease,months:36},headers:{'Idempotency-Key':crypto.randomUUID(),'x-forwarded-for':'198.51.100.98'}});log('Seven-year leasing request saved; other term rejected');
 }
 console.log(`WORKFLOW CHECKS PASSED: ${checks}`);
}finally{await pool.end()}
