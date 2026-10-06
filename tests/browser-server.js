// Isolated test harness. Never imported by server/index.js; no auth bypass exists in production.
import {createApp} from '../server/app.js';import {testDB,deps,user} from './helpers.js';
const db=await testDB();await user(db,10,{premium:true});await user(db,11);await user(db,12,{moderation:'pending'});
const dependencies=deps(db);dependencies.env={...dependencies.env,APP_URL:'http://127.0.0.1:3100'};const app=createApp(dependencies);app.listen(3100,'127.0.0.1');
