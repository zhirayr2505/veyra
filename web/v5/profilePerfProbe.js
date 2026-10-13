// Read-only, opt-in profile motion telemetry. No storage, network or React
// updates in the motion loop. A tiny fixed-size ring records only measured JS
// animation work (not GPU raster or physical screen presentation).
const MAX=240;
const samples=new Float32Array(MAX);
let active=false,head=0,count=0,total=0,slow=0,maxMs=0;
let state={phase:'not-open',progress:0,scrollY:0,collapseDistance:0,frames:0,calibrations:0,heroWidth:0,heroHeight:0,lastFrameAt:0,backend:'unknown'};

export function enableProfileProbe(enabled){
 active=Boolean(enabled);
 head=0;count=0;total=0;slow=0;maxMs=0;
 state={phase:'not-open',progress:0,scrollY:0,collapseDistance:0,frames:0,calibrations:0,heroWidth:0,heroHeight:0,lastFrameAt:0};
}
export const profileProbeEnabled=()=>active;
export function recordProfileCalibration(width,height,distance,backend='JS fallback'){
 if(!active)return;
 state.calibrations++;
 state.heroWidth=width;state.heroHeight=height;state.collapseDistance=distance;state.backend=backend;
}
export function recordProfileFrame(duration,progress,scrollY,distance,phase){
 if(!active)return;
 if(Number.isFinite(duration)&&duration>=0){
  samples[head]=duration;head=(head+1)%MAX;
  count=Math.min(MAX,count+1);total++;maxMs=Math.max(maxMs,duration);
  if(duration>8.33)slow++;
 }
 state.progress=progress;state.scrollY=scrollY;state.collapseDistance=distance;
 state.phase=phase;state.frames++;state.lastFrameAt=performance.now();
}
export function getProfileProbeSnapshot(){
 if(!active)return {enabled:false};
 const list=[];
 for(let i=0;i<count;i++)list.push(samples[i]);
 list.sort((a,b)=>a-b);
 const percentile=(p)=>list.length?list[Math.min(list.length-1,Math.floor((list.length-1)*p))]:0;
 const sum=list.reduce((a,b)=>a+b,0);
 return {...state,enabled:true,paintMsAvg:count?sum/count:0,
  paintMsP95:percentile(.95),paintMsMax:maxMs,framesOverBudget:slow,
  measuredFrames:total,sampleCount:count};
}
