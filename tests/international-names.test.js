import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileFields} from '../server/validation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('server name schema accepts international letter-separated punctuation',()=>{
 const schema=profileFields.shape.name;
 for(const value of ['Анна-Мария','Жан-Люк',"О'Брайен",'О’Брайен','Mary Jane','Հովհաննես-Աննա']){
  assert.equal(schema.safeParse(value).success,true,value);
 }
 for(const value of ['-Анна','Анна-','Анна--Мария',"О''Брайен",'123','Anna2']){
  assert.equal(schema.safeParse(value).success,false,value);
 }
});
test('registration draft accepts separators mid-edit and client keeps them',()=>{
 assert.match(read('server/registration.js'),/\\p\{M\} '’/);
 const client=read('web/v5/Registration.jsx');
 assert.match(client,/const NAME_PATTERN=/);
 assert.match(client,/Имя: буквы, пробелы, дефис или апостроф между буквами/);
});
