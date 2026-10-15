import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {analyzeFrameIntervals,formatPerformanceSummary} from './performanceMetrics.js';
import {enableProfileProbe,getProfileProbeSnapshot} from './profile/motion/profilePerfProbe.js';
import './PerformanceMonitor.css';

const EMPTY=analyzeFrameIntervals([]);
const TAP_COUNT=5,TAP_WINDOW_MS=3600;
const freshStats=()=>({taskCount:0,taskTotalMs:0,taskMaxMs:0,
 loafCount:0,loafTotalMs:0,loafMaxMs:0,blockingMs:0,scriptMs:0,forcedMs:0,
 tasksSupported:false,loafSupported:false,viewport:'—',dpr:1,
 scrollTimelineSupported:false,memory:'not available',telegramVersion:'unknown'});
const memoryString=()=>{
 const m=performance.memory;
 if(!m?.usedJSHeapSize)return 'not available';
 return (m.usedJSHeapSize/1048576).toFixed(1)+' / '+(m.jsHeapSizeLimit/1048576).toFixed(0)+' MB JS heap';
};
const environment=()=>({
 viewport:Math.round(innerWidth)+'×'+Math.round(innerHeight),
 dpr:Number(devicePixelRatio.toFixed(2)),
 scrollTimelineSupported:typeof ScrollTimeline!=='undefined' &&
  Boolean(window.CSS?.supports?.('animation-timeline: scroll()')),
 memory:memoryString(),
 telegramVersion:window.Telegram?.WebApp?.version||'unknown',
});

// Read-only and off by default. All measurements stay in this WebView.
// Five fast taps on the profile logo open the compact panel.
export function PerformanceMonitor(){
 const [visible,setVisible]=useState(false);
 const [expanded,setExpanded]=useState(false);
 const [reading,setReading]=useState({frame:EMPTY,stats:freshStats(),profile:{enabled:false},elapsed:0,history:[]});
 const [copyState,setCopyState]=useState('');
 const [paused,setPaused]=useState(false);
 const taps=useRef({count:0,first:0});

 useEffect(()=>{
  const onTap=e=>{
   const node=e.target;
   if(!(node instanceof Element)||!node.closest('.logo'))return;
   const state=taps.current,now=performance.now();
   if(now-state.first>TAP_WINDOW_MS){state.first=now;state.count=0}
   if(++state.count>=TAP_COUNT){
    state.count=0;state.first=0;
    setVisible(true);setExpanded(false);
   }
  };
  const onKey=e=>{if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='p')setVisible(v=>!v)};
  document.addEventListener('pointerup',onTap,{capture:true,passive:true});
  window.addEventListener('keydown',onKey);
  return()=>{
   document.removeEventListener('pointerup',onTap,true);
   window.removeEventListener('keydown',onKey);
  };
 },[]);

 useEffect(()=>{
  if(!visible)return;
  let running=true,frameId=0,last=0;
  const samples=[];
  const history=[];
  const started=performance.now();
  const supported=window.PerformanceObserver?.supportedEntryTypes||[];
  const counters=freshStats();
  counters.tasksSupported=supported.includes('longtask');
  counters.loafSupported=supported.includes('long-animation-frame');
  enableProfileProbe(true);
  setCopyState('');
  const raf=now=>{
   if(!running)return;
   if(!document.hidden){
    if(last>0){
     const ms=now-last;
     if(ms>=2&&ms<=1000){
      samples.push(ms);
      if(samples.length>180)samples.shift();
     }
    }
    last=now;
   }
   frameId=requestAnimationFrame(raf);
  };
  const changed=()=>{setPaused(document.hidden);last=0;samples.length=0};
  setPaused(document.hidden);
  frameId=requestAnimationFrame(raf);
  document.addEventListener('visibilitychange',changed);
  const observers=[];
  const observe=(type,handler)=>{
   if(!supported.includes(type))return;
   try{
    const observer=new PerformanceObserver(list=>{
     if(!running)return;
     for(const entry of list.getEntries())handler(entry);
    });
    observer.observe({type,buffered:false});
    observers.push(observer);
   }catch{}
  };
  observe('longtask',entry=>{
   counters.taskCount++;
   counters.taskTotalMs+=entry.duration||0;
   counters.taskMaxMs=Math.max(counters.taskMaxMs,entry.duration||0);
  });
  observe('long-animation-frame',entry=>{
   counters.loafCount++;
   counters.loafTotalMs+=entry.duration||0;
   counters.loafMaxMs=Math.max(counters.loafMaxMs,entry.duration||0);
   counters.blockingMs+=entry.blockingDuration||0;
   for(const script of entry.scripts||[]){
    counters.scriptMs+=script.duration||0;
    counters.forcedMs+=script.forcedStyleAndLayoutDuration||0;
   }
  });
  const update=setInterval(()=>{
   if(!running)return;
   const measurement=analyzeFrameIntervals(samples);
   history.push(measurement.fps);
   if(history.length>20)history.shift();
   setReading({frame:measurement,stats:{...counters,...environment()},
    profile:getProfileProbeSnapshot(),elapsed:(performance.now()-started)/1000,history:[...history]});
  },900);
  return()=>{
   running=false;cancelAnimationFrame(frameId);clearInterval(update);
   document.removeEventListener('visibilitychange',changed);
   observers.forEach(o=>o.disconnect());
   enableProfileProbe(false);
  };
 },[visible]);

 if(!visible)return null;
 const {frame,stats,profile,elapsed,history}=reading;
 const fps=frame.fps;
 const health=fps>=85?'fast':fps>=55?'ok':'slow';
 const summary=formatPerformanceSummary(frame,{
  elapsedSec:elapsed,longTaskCount:stats.taskCount,loafCount:stats.loafCount,
  details:stats,profile,samples:history});
 const copy=async()=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
   await navigator.clipboard.writeText(summary);setCopyState('Скопировано');
  }catch{
   setCopyState('Выдели текст ниже');setExpanded(true);
  }
 };
 const number=n=>Number.isFinite(n)?n.toFixed(1):'—';
 return createPortal(
  <div className={'veyra-fps-monitor'+(expanded?' expanded':'')} role="group" aria-label="Монитор FPS VEYRA">
   <div className="veyra-fps-head">
    <div className="veyra-fps-readout" data-health={health}>
     <span className="veyra-fps-light"/>
     <strong data-testid="veyra-fps-value">{fps?fps.toFixed(0):'—'}</strong><span>FPS</span>
    </div>
    <button type="button" className="veyra-fps-details" onClick={()=>setExpanded(s=>!s)}
     aria-label={expanded?'Свернуть FPS':'Подробности FPS'} aria-expanded={expanded}>{expanded?'−':'+'}</button>
    <button type="button" className="veyra-fps-close" onClick={()=>setVisible(false)} aria-label="Закрыть FPS">×</button>
   </div>
   {expanded&&<div className="veyra-fps-body">
    <div className="veyra-fps-title">VEYRA · Chromium WebView <span>{paused?'Пауза':'Измерение'}</span></div>
    <dl className="veyra-fps-stats">
     <div><dt>Среднее FPS (rAF)</dt><dd>{fps||'—'}</dd></div>
     <div><dt>Кадр p95 / p99</dt><dd>{number(frame.p95)} / {number(frame.p99)} ms</dd></div>
     <div><dt>Макс. время кадра</dt><dd>{number(frame.maxMs)} ms</dd></div>
     <div><dt>Типичный интервал</dt><dd>{number(frame.typicalMs)} ms</dd></div>
     <div><dt>Частота rAF</dt><dd>~{frame.estimatedHz||'—'} Hz</dd></div>
     <div><dt>Пропуски, оценка</dt><dd>{frame.skippedIntervals}</dd></div>
     <div><dt>Долгие JS-задачи</dt><dd>{stats.taskCount} · {number(stats.taskTotalMs)} ms</dd></div>
     <div><dt>Худшая JS-задача</dt><dd>{number(stats.taskMaxMs)} ms</dd></div>
     <div><dt>Долгие анимац. кадры</dt><dd>{stats.loafSupported?stats.loafCount:'не поддерживается'}</dd></div>
     <div><dt>Худший длинный кадр</dt><dd>{stats.loafSupported?number(stats.loafMaxMs)+' ms':'—'}</dd></div>
     <div><dt>Скрипты внутри LoAF</dt><dd>{stats.loafSupported?number(stats.scriptMs)+' ms':'—'}</dd></div>
     <div><dt>Forced layout внутри LoAF</dt><dd>{stats.loafSupported?number(stats.forcedMs)+' ms':'—'}</dd></div>
    </dl>
    <div className="veyra-fps-section">Профиль · {profile.enabled?profile.phase:'не открыт'}</div>
    <dl className="veyra-fps-stats">
     <div><dt>Сворачивание</dt><dd>{profile.enabled?Math.round(profile.progress*100)+'%':'—'}</dd></div>
     <div><dt>JS анимации p95</dt><dd>{profile.enabled?number(profile.paintMsP95)+' ms':'—'}</dd></div>
     <div><dt>Макс. JS анимации</dt><dd>{profile.enabled?number(profile.paintMsMax)+' ms':'—'}</dd></div>
     <div><dt>Тяжёлые JS-кадры &gt;8,33 мс</dt><dd>{profile.enabled?profile.framesOverBudget:'—'}</dd></div>
     <div><dt>Перекалибровки</dt><dd>{profile.enabled?profile.calibrations:'—'}</dd></div>
     <div><dt>Движок кнопок</dt><dd>{profile.enabled?profile.backend:'—'}</dd></div>
    </dl>
    <div className="veyra-fps-section">Устройство · {stats.viewport} · DPR {stats.dpr}</div>
    <div className="veyra-fps-device">ScrollTimeline: {stats.scrollTimelineSupported?'есть':'недоступен'} · Telegram {stats.telegramVersion}<br/>
      JS heap: {stats.memory}</div>
    <div className="veyra-fps-foot">
     <button type="button" onClick={copy}>Копировать подробный отчёт</button>
     <span>{copyState||Math.floor(elapsed)+' с'}</span>
    </div>
    {copyState==='Выдели текст ниже'&&<textarea className="veyra-fps-copy-fallback" readOnly
     aria-label="Отчёт FPS" value={summary} onFocus={e=>e.target.select()}/>}
    <p>FPS = ритм вызовов rAF, не фактически показанные кадры. LoAF отражает долгие кадры браузера. Все данные остаются на устройстве.</p>
   </div>}
  </div>,document.body);
}
