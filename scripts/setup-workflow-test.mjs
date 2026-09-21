import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import nextEnv from '@next/env';
import { POSTGRES_SCHEMA_SQL } from '../db/postgres-schema.ts';
import { ADMIN_V2_SCHEMA_SQL } from '../db/admin-v2-schema.ts';
nextEnv.loadEnvConfig(process.cwd());
if(process.env.ATADAN_ISOLATED_TESTS!=='1')throw new Error('Set ATADAN_ISOLATED_TESTS=1 to create a disposable test schema');
const url=new URL(process.env.DATABASE_URL||process.env.POSTGRES_URL);
if(url.searchParams.get('options')?.includes('atadan_test_'))throw new Error('An isolated schema is already configured; reuse it instead of replacing the original environment backup');
if(fs.existsSync('../atadan-test-context.json'))throw new Error('A test context already exists; clean it up before creating another');
const ssl=url.searchParams.get('sslmode');url.searchParams.delete('sslmode');
const pool=new pg.Pool({connectionString:url.toString(),ssl:ssl&&ssl!=='disable'?{rejectUnauthorized:true}:undefined,max:1});
const schema=`atadan_test_${Date.now()}`;
if(!/^atadan_test_\d+$/.test(schema))throw Error('Invalid schema');
const client=await pool.connect();
try{
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(POSTGRES_SCHEMA_SQL);
  await client.query(ADMIN_V2_SCHEMA_SQL);
  const actors=[];
  for(const [id,role] of [['test-owner','owner'],['test-manager','manager'],['test-other','manager']]){
    const token=crypto.randomBytes(32).toString('hex');
    await client.query("INSERT INTO staff(id,email,display_name,role,active) VALUES($1,$2,$3,$4,1)",[id,`${id}@example.test`,id,role]);
    await client.query("INSERT INTO staff_sessions(token_hash,staff_id,expires_at,id) VALUES($1,$2,$3,$4)",[crypto.createHash('sha256').update(token).digest('hex'),id,Math.floor(Date.now()/1000)+86400,crypto.randomUUID()]);
    actors.push({id,role,token});
  }
  url.hostname=url.hostname.replace('-pooler.','.');
  url.searchParams.set('options',`-c search_path=${schema}`);if(ssl)url.searchParams.set('sslmode',ssl);
  const original=fs.readFileSync('.env.local','utf8');
  fs.writeFileSync('../atadan-production.env',original);
  fs.writeFileSync('.env.local',original.replace(/^(DATABASE_URL|POSTGRES_URL)=.*$/gm,'')+`\nDATABASE_URL=${JSON.stringify(url.toString())}\n`);
  fs.writeFileSync('../atadan-test-context.json',JSON.stringify({schema,actors}));
  fs.writeFileSync('../atadan-test-state.json',JSON.stringify({cookies:[{name:'atadan_staff',value:actors[0].token,domain:'localhost',path:'/',expires:Math.floor(Date.now()/1000)+86400,httpOnly:true,secure:false,sameSite:'Strict'}],origins:[]}));
  console.log('Isolated test schema initialized; three test roles and temporary sessions ready.');
}finally{client.release();await pool.end()}
