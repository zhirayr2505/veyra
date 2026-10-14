import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeAxis,swipeStep,swipeBound} from '../web/v5/photoSwipeMath.js';

test('axis lock ignores diagonal gestures and leaves vertical profile scroll alone',()=>{
 assert.equal(swipeAxis(8,0),null);
 assert.equal(swipeAxis(36,8),'x');
 assert.equal(swipeAxis(18,40),'y');
 assert.equal(swipeAxis(15,20),'y');
});
test('hero swipe honors 25% travel or 0.35 px/ms flick',()=>{
 assert.equal(swipeStep(-110,400,0),-1);
 assert.equal(swipeStep(130,400,0),1);
 assert.equal(swipeStep(-35,400,.4),-1);
 assert.equal(swipeStep(20,400,.1),0);
 assert.equal(swipeBound(900,400),428);
});
