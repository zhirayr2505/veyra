import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('profile preview uses real, fully seeded read-only Member and keeps registration actions',()=>{
 const preview=read('web/v5/ProfilePreview.jsx');
 const member=read('web/v5/Member.jsx');
 assert.match(preview,/<Member id="registration-preview" readOnly previewData=\{readOnlyData\}/);
 assert.match(member,/if\(isPreview\)/);
 assert.match(member,/if\(ownSeed\)return/);
 assert.match(member,/!isPreview&&createPortal/);
 assert.match(preview,/onSubmit\?<>/);
});
test('profile preview stage is local and hides account actions but retains scroll',()=>{
 const css=read('web/v5/ProfilePreview.css');
 assert.match(css,/\.vx-preview-member-stage/);
 assert.match(css,/\.vx-profile-read-only \.vx-profile-primary-actions/);
 assert.match(css,/\.vx-profile-scroller\{position:absolute/);
});

test('preview feed card and live discover use identical visual component',()=>{
 const feed=read('web/v5/Discover.jsx'),preview=read('web/v5/ProfilePreview.jsx');
 assert.match(feed,/<FeedCardVisual card=\{card\}/);
 assert.match(preview,/<FeedCardVisual card=\{readOnlyData\}/);
 assert.match(read('web/v5/FeedCardVisual.jsx'),/<CardCaption /);
});
