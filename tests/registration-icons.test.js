import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('registration only uses approved Veyra pack, while categories use Lucide',()=>{
 const reg=read('web/v5/Registration.jsx');
 const options=read('web/v5/OnboardingOptions.jsx');
 const assets=read('web/v5/UI.jsx');
 assert.doesNotMatch(reg,/DesignGlyph|veyra-brand-glyph|#[\da-f]{6}'\s*:\s*#[\da-f]{6}/i);
 for(const name of ['man','woman','everyone','location','camera'])assert.ok(assets.includes('"'+name+'"')||assets.includes(','+name+',')||assets.includes("'"+name+"'"),name);
 assert.match(options,/from 'lucide-react'/);
 assert.match(options,/function CategoryGlyph/);
 assert.doesNotMatch(read('web/v5/Registration2026.css'),/veyra-brand-glyph/);
});
