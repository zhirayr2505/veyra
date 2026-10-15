// Stage 2.2 scoped Chromium release gate. Stage 0's whitelist is NOT proof
// that profile regressions passed. Block any failure beyond the three
// independently reproduced failures in unchanged screens.
import {readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2]||'test-results/v5-results.json';
const report=JSON.parse(await readFile(source,'utf8'));
const allowed=new Set([
 'VEYRA pending approval displays animated crystal, genuine status and close action',
 'VISUAL_AUDIT registration through approved dating tabs captures reference screenshots',
 'VEYRA premium feed morphs violet pill between all three tabs with readable crown and balance'
]);
const required=[
 'STAGE2.2 contact sheets: eleven forward/reverse frames, photo 3, mobile and landscape',
 '32 real CDP touch releases always reach one of two rests',
 'STAGE2.2 editor round-trip preserves selected photo and Embla tab'
];
const all=[];
function scan(suites){for(const suite of suites||[]){for(const spec of suite.specs||[])for(const test of spec.tests||[]){if(test.projectName==='v5')all.push({title:spec.title,status:test.status})}scan(suite.suites)}}
scan(report.suites);
const failures=all.filter(x=>x.status!=='expected'),violations=failures.filter(x=>!allowed.has(x.title));
const missing=required.filter(title=>!all.some(x=>x.title===title&&x.status==='expected'));
const result={stage:'2.2',total:all.length,passed:all.length-failures.length,profile_regressions:violations.length,
 preexisting_outside_stage:failures.filter(x=>allowed.has(x.title)).map(x=>x.title),violations,missing_required:missing,
 accepted:all.length>=70&&violations.length===0&&missing.length===0};
console.log('STAGE2_2_RELEASE_GATE|'+JSON.stringify(result));
await writeFile('test-results/stage2-2-release-gate.json',JSON.stringify(result,null,2));
if(!result.accepted)process.exitCode=1;
