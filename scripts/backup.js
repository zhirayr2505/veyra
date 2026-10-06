import {spawn} from 'node:child_process';import {createWriteStream} from 'node:fs';import {randomBytes,createCipheriv} from 'node:crypto';import {createGzip} from 'node:zlib';import {pipeline} from 'node:stream/promises';
if(!process.env.DATABASE_URL||!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY||''))throw Error('DATABASE_URL and 32-byte hex BACKUP_ENCRYPTION_KEY required');
const output=process.argv[2];if(!output)throw Error('Usage: node scripts/backup.js output.sql.gz.enc');
const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',Buffer.from(process.env.BACKUP_ENCRYPTION_KEY,'hex'),iv);const dest=createWriteStream(output,{flags:'wx',mode:0o600});dest.write(Buffer.concat([Buffer.from('VEYRA1'),iv]));
const child=spawn('pg_dump',['--schema=veyra','--no-owner','--no-acl'],{env:{...process.env,PGDATABASE:process.env.DATABASE_URL},stdio:['ignore','pipe','pipe']});child.stderr.resume();
const done=new Promise((resolve,reject)=>{child.on('error',()=>reject(Error('pg_dump unavailable')));child.on('close',code=>code===0?resolve():reject(Error('pg_dump failed')));});
try{await Promise.all([pipeline(child.stdout,createGzip(),cipher,dest,{end:false}),done]);dest.end(cipher.getAuthTag());console.log('Encrypted backup complete');}catch(e){dest.destroy();throw e;}
