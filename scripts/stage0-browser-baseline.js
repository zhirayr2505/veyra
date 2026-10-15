// Stage 0 release gate: preserve/print real Chromium failures, but only block
// on failures not already present in the BEFORE-PR main CI run 38561917887.
// Never mark individual Playwright scenarios as passing when they failed.
import {readFile} from 'node:fs/promises';
const path=process.argv[2]||'test-results/v5-results.json';
const known=[
 'VEYRA pending approval displays animated crystal',
 'VEYRA eight-step onboarding verifies location',
 'New registration has a pinned CTA',
 'VEYRA V2 serves its own wordmark',
 'VISUAL_AUDIT registration through approved dating tabs',
 'VEYRA member profile transforms its whole hero',
 'VEYRA fullscreen member keeps brand pinned',
 'VEYRA swipe track follows finger',
 'VEYRA Telegram staged morph holds full-width cover',
 'VEYRA FPS debug panel stays off until five logo taps',
 'VEYRA Motion 3 panel remains opaque',
 'VEYRA final visual: halo only when compact',
 'Dragging from photo thumbnails changes the horizontal tab',
 'VEYRA premium feed morphs violet pill'
];
const report=JSON.parse(await readFile(path,'utf8'));
const specs=[];
function walk(suites){
 for(const suite of suites||[]){
  for(const spec of suite.specs||[])specs.push(spec);
  walk(suite.suites);
 }
}
walk(report.suites);
let total=0;
const failures=[];
for(const spec of specs)for(const test of spec.tests||[]){
 if(test.projectName!=='v5')continue;
 total++;
 if(test.status!=='expected')failures.push({title:spec.title,status:test.status,details:(test.results||[]).map(r=>({status:r.status,error:r.error?.message||'',errors:(r.errors||[]).map(e=>e.message||'').slice(0,2)}))});
}
const unexpected=failures.filter(f=>!known.some(x=>f.title.includes(x)));
const duplicates=failures.filter(f=>known.filter(x=>f.title.includes(x)).length!==1);
// Error details are CI-only text; preserve the existing baseline gate semantics.
for(const f of unexpected)console.log(JSON.stringify({event:'stage2_hotfix_browser_failure',title:f.title,status:f.status,details:f.details.map(x=>({status:x.status,error:String(x.error).slice(0,1300),errors:x.errors.map(e=>String(e).slice(0,1300))}))}));
console.log(JSON.stringify({event:'stage0_chromium_baseline_comparison',main_baseline_run:38561917887,total,passed:total-failures.length,known_baseline_failures:failures.length-unexpected.length,new_regressions:unexpected.length,known_failure_titles:failures.filter(f=>!unexpected.includes(f)).map(f=>f.title),new_failure_titles:unexpected.map(f=>f.title)}));
if(total<50||unexpected.length||duplicates.length||!report.suites?.length){
 console.error('STAGE0_CHROMIUM_REGRESSION_GATE_FAILED');process.exitCode=1;
}
