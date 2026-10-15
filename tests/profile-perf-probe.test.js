import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProfileProbe,profileProbeEnabled,recordProfileCalibration,recordProfileFrame,getProfileProbeSnapshot} from '../web/v5/profile/motion/profilePerfProbe.js';

test('profiling is completely disabled by default and after hide',()=>{
 enableProfileProbe(false);
 recordProfileFrame(4,1,400,400,'avatar');
 assert.equal(profileProbeEnabled(),false);
 assert.equal(getProfileProbeSnapshot().enabled,false);
});
test('motion monitor records script time, progress and calibration without exporting user info',()=>{
 enableProfileProbe(true);
 recordProfileCalibration(390,447,373);
 recordProfileFrame(2.5,.33,123,373,'center');
 recordProfileFrame(9.1,.66,246,373,'avatar');
 const value=getProfileProbeSnapshot();
 assert.equal(value.enabled,true);
 assert.equal(value.measuredFrames,2);
 assert.equal(value.framesOverBudget,1);
 assert.equal(value.phase,'avatar');
 assert.equal(value.progress,.66);
 assert.equal(value.heroWidth,390);
 assert.ok(value.paintMsP95>=2);
 enableProfileProbe(false);
});
