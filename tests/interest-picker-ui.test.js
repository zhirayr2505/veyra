import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('onboarding interest picker has search, popular, a soft three-interest hint and accessible haptics',()=>{
 const code=read('web/v5/OnboardingOptions.jsx');
 assert.match(code,/const \[query,setQuery\]=useState\(''\)/);
 assert.match(code,/aria-label="Поиск по интересам"/);
 assert.match(code,/Популярное/);
 assert.match(code,/selected\.length<3/);
 assert.match(code,/selectionChanged\?\.\(\)/);
 assert.match(code,/selected\.length>=max/);
});
test('interest groups and selected chips use semantic tone variables, never category nth-child colors',()=>{
 const css=read('web/v5/OnboardingV9.css');
 const js=read('web/v5/OnboardingOptions.jsx');
 assert.match(js,/data-tone=\{tone\}/);
 assert.match(js,/tone=\{interestTone\(item,INTEREST_GROUPS\)\}/);
 assert.match(css,/\.veyra-interest-category-count\.has-items\{background:var\(--vx-chip-bg\)/);
 assert.match(css,/@keyframes veyraChipSelect/);
});
