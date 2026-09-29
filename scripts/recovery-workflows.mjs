import fs from 'node:fs';import assert from 'node:assert/strict';import nextEnv from '@next/env';import pg from 'pg';
import { ADMIN_V2_SCHEMA_SQL } from '../db/admin-v2-schema.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
nextEnv.loadEnvConfig(process.cwd());const {actors,schema}=JSON.parse(fs.readFileSync('../atadan-test-context.json','utf8'));
const url=new URL(process.env.DATABASE_URL);assert.equal(url.searchParams.get('options'),`-c search_path=${schema}`);const ssl=url.searchParams.get('sslmode');url.searchParams.delete('sslmode');
const pool=new pg.Pool({connectionString:url.toString(),ssl:ssl?{rejectUnauthorized:true}:undefined,max:2});const base='http://localhost:3022';
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies([{name:'atadan_staff',value:actors[0].token,url:base}]);
const page=await context.newPage();
try{
 const id=`legacy-group-${Date.now()}`;await pool.query("INSERT INTO admin_records(id,kind,title,status,data_json,created_by) VALUES($1,'employee_group','Старая рабочая группа','active',$2,'test-owner')",[id,JSON.stringify({members:['test-manager']})]);await pool.query("DELETE FROM schema_migrations WHERE id='legacy-chat-groups-20260922'");await pool.query(ADMIN_V2_SCHEMA_SQL);
 const response=await fetch(base+'/api/admin/collaboration',{method:'POST',headers:{Origin:base,Cookie:`atadan_staff=${actors[1].token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'send_message',groupId:id,text:'После переноса группы'})});assert.equal(response.status,201,await response.text());console.log('PASS: existing work group retains members and accepts new messages after migration');
 await page.goto(base+'/admin/company/expenses');await page.getByRole('button',{name:'Добавить расход'}).click();const dialog=page.getByRole('dialog');await dialog.locator('[name=title]').fill('Проверка сети');await dialog.locator('[name=amount]').fill('250');await dialog.locator('[name=counterparty]').fill('Тестовый получатель');
 await page.route('**/api/admin/records',async route=>{if(route.request().method()==='POST')await route.abort('failed');else await route.continue()});
 await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Нет соединения. Данные остались в форме, попробуйте сохранить ещё раз.',{exact:true}).waitFor();assert.equal(await dialog.locator('[name=title]').inputValue(),'Проверка сети');assert.equal(await dialog.locator('[name=amount]').inputValue(),'250');
 await page.unroute('**/api/admin/records');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await dialog.waitFor({state:'hidden',timeout:30000});console.log('PASS: interrupted save preserves form values and successful retry saves expense');
 await page.goto(base+'/admin/company/notifications');await page.getByRole('heading',{name:'Уведомления',exact:true}).first().waitFor();await page.waitForFunction(()=>document.querySelector('.admin-sidebar').getBoundingClientRect().right<0);await page.screenshot({path:'../notifications-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));console.log('PASS: mobile navigation stays closed and notifications fit the screen');
}finally{await browser.close();await pool.end()}
