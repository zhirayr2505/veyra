import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'tests/browser',fullyParallel:false,workers:1,timeout:120000,
 use:{actionTimeout:10000,viewport:{width:390,height:844},screenshot:'only-on-failure',launchOptions:{executablePath:process.env.CHAT_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
 projects:[
  {name:'app',testMatch:['flows.spec.js','design.spec.js','operations.spec.js'],use:{baseURL:'http://127.0.0.1:3100'}},
  {name:'chat',testMatch:['messages-*.spec.js','profile.spec.js'],use:{baseURL:'http://127.0.0.1:3101'}}
 ],
 webServer:[
  {command:'node tests/browser-server.js',port:3100,reuseExistingServer:false},
  {command:'node tests/chat-browser-server.js',port:3101,env:{CHAT_TEST_PORT:'3101'},reuseExistingServer:false}
 ]
});

