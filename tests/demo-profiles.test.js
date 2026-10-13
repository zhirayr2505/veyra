import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_PROFILES,getDemoProfile,getDemoProfiles,isDemoProfile,isDemoPhoto,demoPhotoUrl} from '../web/v5/DemoProfiles.js';

test('owner visual showroom contains 12 labelled adults with balanced genders and photos',()=>{
 assert.equal(DEMO_PROFILES.length,12);
 assert.equal(DEMO_PROFILES.filter(p=>p.gender==='woman').length,6);
 assert.equal(DEMO_PROFILES.filter(p=>p.gender==='man').length,6);
 assert.equal(new Set(DEMO_PROFILES.map(p=>p.id)).size,12);
 for(const person of DEMO_PROFILES){
  assert.ok(person.age>=18);
  assert.ok(person.name&&person.city&&person.bio&&person.interests.length>=3);
  assert.equal(person.demo_profile,true);
  assert.equal(person.test_profile,true);
  assert.equal(isDemoProfile(person.id),true);
  assert.equal(getDemoProfile(person.id).id,person.id);
  assert.equal(person.photos.length,3);
  for(const photo of person.photos){
   assert.ok(isDemoPhoto(photo));
   const source=demoPhotoUrl(photo);
   const url=new URL(source);
   assert.equal(url.protocol,'https:');
   assert.equal(url.hostname,'images.unsplash.com');
   assert.ok(Number(url.searchParams.get('w'))>=1000);
   assert.ok(Number(url.searchParams.get('q'))>=85);
  }
 }
 assert.equal(getDemoProfile('1'),null);
 assert.equal(isDemoPhoto('https://other.example/'),false);
 assert.equal(demoPhotoUrl('demo-photo-99-0'),null);
});

test('owner showroom populates all three tabs and real-filter collection previews',()=>{
 const feed=getDemoProfiles('feed');
 const forYou=getDemoProfiles('for_you');
 const nearby=getDemoProfiles('nearby',{city:'Краснодар'});
 for(const list of [feed,forYou,nearby]){
  assert.equal(list.length,12);
  assert.ok(list.some(p=>p.gender==='man'));
  assert.ok(list.some(p=>p.gender==='woman'));
 }
 assert.ok(nearby.every(p=>p.city==='Краснодар'));
 assert.ok(getDemoProfiles('for_you',{collection:'serious'}).every(p=>p.goal==='relationship'));
 assert.ok(getDemoProfiles('for_you',{collection:'travel'}).every(p=>p.interests.includes('Путешествия')));
 assert.ok(getDemoProfiles('for_you',{collection:'common'}).every(p=>p.interests.includes('Кофе')||p.interests.includes('Музыка')));
});
