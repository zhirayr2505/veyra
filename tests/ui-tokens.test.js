import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v5 imports one shared palette after screen overrides',()=>{
 const app=read('web/v5/App.jsx');
 assert.ok(app.includes("import './tokens.css'"));
 const tokens=read('web/v5/tokens.css');
 for(const name of ['--vx-gradient-primary','--vx-radius-button','--vx-radius-card','--vx-radius-chip','--vx-height-primary','--vx-height-secondary','--vx-height-chip','--vx-shadow-cta','--vx-color-accent'])
  assert.ok(tokens.includes(name+':'),name);
 assert.ok(tokens.includes('#ae60fc'));
 assert.ok(tokens.includes('#7628e5'));
});

test('all seven interest tones have one source and registration/profile share button tokens',()=>{
 const tokens=read('web/v5/tokens.css');
 const profile=read('web/v5/MemberPolish7.css');
 for(const tone of ['violet','rose','sky','mint','amber','iris','teal']){
  assert.ok(tokens.includes('--vx-tone-'+tone+'-bg:'));
  assert.ok(tokens.includes('[data-tone="'+tone+'"]'));
  assert.ok(!profile.includes('.vx-member-interest[data-tone="'+tone+'"]{--vx-chip-bg:'),'no duplicate '+tone+' CSS');
 }
 const registration=read('web/v5/Registration2026.css');
 const preview=read('web/v5/ProfilePreview.css');
 assert.match(registration,/background:var\(--vx-gradient-primary\)!important/);
 assert.match(registration,/border-radius:var\(--vx-radius-button\)!important/);
 assert.match(preview,/\.vp-primary\{[^}]*background:var\(--vx-gradient-primary\)/);
});
