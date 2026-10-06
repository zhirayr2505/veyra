import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',fullyParallel:false,workers:1,use:{baseURL:'http://127.0.0.1:3100',viewport:{width:390,height:844},screenshot:'only-on-failure'},webServer:{command:'node tests/browser-server.js',port:3100,reuseExistingServer:false}});
