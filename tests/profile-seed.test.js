import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfileSeed,mergeProfileSeed} from '../web/v5/profileSeed.js';

test('card data renders immediately, with all known portrait ids',()=>{
 const card={id:'23',name:'Анна',age:27,photos:[{id:'p1'},'p2'],interests:['Книги']};
 assert.deepEqual(normalizeProfileSeed(card,23),{...card,photos:['p1','p2']});
 assert.equal(normalizeProfileSeed(card,44),null);
});

test('remote hydration merges without erasing known card fields',()=>{
 const seed=normalizeProfileSeed({id:23,name:'Анна',photos:['p1'],goal:'relationship'},23);
 const hydrated=mergeProfileSeed(seed,{id:23,bio:'Люблю прогулки',name:undefined,interests:['Музыка']});
 assert.equal(hydrated.name,'Анна');
 assert.equal(hydrated.bio,'Люблю прогулки');
 assert.deepEqual(hydrated.photos,['p1']);
 assert.deepEqual(hydrated.interests,['Музыка']);
 assert.deepEqual(mergeProfileSeed(seed,null),seed);
});
