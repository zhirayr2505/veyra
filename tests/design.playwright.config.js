import base from './chat.playwright.config.js';
export default {...base,testMatch:'design.spec.js',timeout:120000,webServer:{command:'node browser-server.js',port:3100,reuseExistingServer:false}};
