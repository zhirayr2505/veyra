// Isolated test harness. Never imported by server/index.js; no auth bypass exists in production.
import {createApp} from '../server/app.js';import {testDB,deps,user} from './helpers.js';
import sharp from 'sharp';
const db=await testDB();await user(db,10,{premium:true});await user(db,11);await user(db,12,{moderation:'pending'});
const dependencies=deps(db);dependencies.env={...dependencies.env,APP_URL:'http://127.0.0.1:3100'};
const placeholder=await sharp({create:{width:600,height:800,channels:3,background:'#713da0'}}).webp().toBuffer();
const photos=new Map();dependencies.storage={put:async(key,buffer)=>photos.set(key,await sharp(buffer).webp().toBuffer()),get:async key=>photos.get(key)||placeholder,remove:async key=>photos.delete(key)};
const app=createApp(dependencies);app.listen(3100,'127.0.0.1');
