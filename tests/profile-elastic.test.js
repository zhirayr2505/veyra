import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticPullDistance,elasticPhotoScale} from '../web/v5/profileElasticMath.js';

test('elastic overpull is resistant and bounded, with <3.2% photo growth',()=>{
 assert.equal(elasticPullDistance(0),0);
 assert.equal(elasticPullDistance(-100),0);
 let prev=-1;
 for(let dy=0;dy<=1100;dy+=5){
  const pull=elasticPullDistance(dy),scale=elasticPhotoScale(pull);
  assert.ok(pull>=prev,'elastic pull should be monotonic');
  assert.ok(pull<=44);
  assert.ok(scale>=1&&scale<=1.032);
  prev=pull;
 }
 assert.ok(elasticPullDistance(160)-elasticPullDistance(100) <
  elasticPullDistance(60)-elasticPullDistance(0),'resistance should increase');
});
test('zero pull is precisely identity and handles invalid motion values',()=>{
 assert.equal(elasticPhotoScale(0),1);
 assert.equal(elasticPullDistance(NaN),0);
 assert.equal(elasticPhotoScale(9999),elasticPhotoScale(44));
});
