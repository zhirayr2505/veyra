// Read-only requestAnimationFrame diagnostics. These values describe JS callback
// cadence, NOT guaranteed physically presented frames or Android display Hz.
const percentile=(sorted,p)=>{
 if(!sorted.length)return 0;
 const i=(sorted.length-1)*p,k=Math.floor(i),fraction=i-k;
 return sorted[k]+((sorted[Math.min(sorted.length-1,k+1)]-sorted[k])*fraction);
};
export function analyzeFrameIntervals(values){
 const valid=values.filter(ms=>Number.isFinite(ms)&&ms>=2&&ms<=1000);
 if(valid.length<3)return{fps:0,p95:0,p99:0,averageMs:0,typicalMs:0,
  estimatedHz:0,lateFrames:0,skippedIntervals:0,maxMs:0,samples:valid.length};
 const sorted=valid.slice().sort((a,b)=>a-b);
 const medianFast=percentile(sorted.slice(0,Math.max(3,Math.ceil(sorted.length*.45))),.5);
 const elapsed=valid.reduce((sum,n)=>sum+n,0);
 const typicalMs=Math.max(1,medianFast);
 const lateThreshold=Math.max(20,typicalMs*1.5);
 return{
  fps:Math.round((valid.length*1000/elapsed)*10)/10,
  p95:Math.round(percentile(sorted,.95)*10)/10,
  p99:Math.round(percentile(sorted,.99)*10)/10,
  averageMs:Math.round(elapsed/valid.length*10)/10,
  typicalMs:Math.round(typicalMs*10)/10,
  estimatedHz:Math.round(1000/typicalMs),
  lateFrames:valid.filter(n=>n>lateThreshold).length,
  skippedIntervals:valid.reduce((n,ms)=>n+Math.max(0,Math.round(ms/typicalMs)-1),0),
  maxMs:Math.round(sorted[sorted.length-1]*10)/10,
  samples:valid.length,
 };
}
export function formatPerformanceSummary(metrics,{elapsedSec=0,longTaskCount=0,loafCount=0}={}){
 return [
  'VEYRA performance (rAF estimate; not physical screen FPS)',
  'FPS: '+metrics.fps,
  'p95 frame time: '+metrics.p95+' ms',
  'p99 frame time: '+metrics.p99+' ms',
  'Estimated cadence: ~'+metrics.estimatedHz+' Hz',
  'Potential skipped intervals: '+metrics.skippedIntervals,
  'Long JS tasks >50ms: '+longTaskCount,
  'Long animation frames: '+loafCount,
  'Session: '+Math.round(elapsedSec)+' s',
  'User agent: '+(typeof navigator==='undefined'?'unknown':navigator.userAgent),
 ].join('\n');
}
