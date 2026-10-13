import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {analyzeFrameIntervals,formatPerformanceSummary} from './performanceMetrics.js';
import './PerformanceMonitor.css';

const EMPTY=analyzeFrameIntervals([]);
const TAP_COUNT=5;
const TAP_WINDOW_MS=3600;

// Nothing samples frames while the panel is closed. The data stays local,
// and is never sent to the API or stored in the user's profile.
export function PerformanceMonitor(){
 const [visible,setVisible]=useState(false);
 const [expanded,setExpanded]=useState(false);
 const [report,setReport]=useState(EMPTY);
 const [elapsed,setElapsed]=useState(0);
 const [longTasks,setLongTasks]=useState(0);
 const [longFrames,setLongFrames]=useState(0);
 const [copyState,setCopyState]=useState('');
 const [paused,setPaused]=useState(false);
 const taps=useRef({count:0,first:0});
 const counters=useRef({tasks:0,loafs:0});
 useEffect(()=>{
  const onTap=e=>{
   const target=e.target;
   if(!(target instanceof Element)||!target.closest('.logo'))return;
   const now=performance.now(),state=taps.current;
   if(now-state.first>TAP_WINDOW_MS){state.first=now;state.count=0}
   state.count++;
   if(state.count>=TAP_COUNT){
    state.count=0;state.first=0;setVisible(true);setExpanded(false);
   }
  };
  const onKey=e=>{if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='p')setVisible(s=>!s)};
  document.addEventListener('pointerup',onTap,{passive:true,capture:true});
  window.addEventListener('keydown',onKey);
  return()=>{
   document.removeEventListener('pointerup',onTap,true);
   window.removeEventListener('keydown',onKey);
  };
 },[]);
 useEffect(()=>{
  if(!visible)return;
  let alive=true,frame=0;
  const intervals=[];
  let last=0,start=performance.now();
  const tick=now=>{
   if(!alive)return;
   if(!document.hidden){
    if(last){
     const delta=now-last;
     if(delta>=2&&delta<=1000){
      intervals.push(delta);
      if(intervals.length>160)intervals.shift();
     }
    }
    last=now;
   }
   frame=requestAnimationFrame(tick);
  };
  const visibility=()=>{
   setPaused(document.hidden);
   last=0;
   if(!document.hidden)intervals.length=0;
  };
  visibility();
  counters.current={tasks:0,loafs:0};
  setReport(EMPTY);setLongTasks(0);setLongFrames(0);setElapsed(0);setCopyState('');
  frame=requestAnimationFrame(tick);
  const supported=window.PerformanceObserver?.supportedEntryTypes||[];
  const observers=[];
  const observe=(type,callback)=>{
   if(!supported.includes(type))return;
   try{
    const observer=new PerformanceObserver(list=>{
     if(!alive)return;
     counters.current[type==='longtask'?'tasks':'loafs']+=list.getEntries().length;
    });
    observer.observe({type,buffered:false});
    observers.push(observer);
   }catch{}
  };
  observe('longtask');
  observe('long-animation-frame');
  const update=setInterval(()=>{
   if(!alive)return;
   setReport(analyzeFrameIntervals(intervals));
   setLongTasks(counters.current.tasks);
   setLongFrames(counters.current.loafs);
   setElapsed((performance.now()-start)/1000);
  },750);
  document.addEventListener('visibilitychange',visibility);
  return()=>{
   alive=false;
   cancelAnimationFrame(frame);
   clearInterval(update);
   observers.forEach(o=>o.disconnect());
   document.removeEventListener('visibilitychange',visibility);
  };
 },[visible]);

 if(!visible)return null;
 const fps=report.fps;
 const health=fps>=85?'fast':fps>=55?'ok':'slow';
 const summary=formatPerformanceSummary(report,{elapsedSec:elapsed,longTaskCount:longTasks,loafCount:longFrames});
 const copy=async()=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
   await navigator.clipboard.writeText(summary);
   setCopyState('Скопировано');
  }catch{setCopyState('Выдели текст ниже');setExpanded(true)}
 };
 return createPortal(
  <div className={'veyra-fps-monitor'+(expanded?' expanded':'')} role="group" aria-label="Монитор FPS VEYRA">
   <div className="veyra-fps-head">
    <div className="veyra-fps-readout" data-health={health}>
     <span className="veyra-fps-light"/>
     <strong data-testid="veyra-fps-value">{fps?fps.toFixed(0):'—'}</strong>
     <span>FPS</span>
    </div>
    <button type="button" className="veyra-fps-details" onClick={()=>setExpanded(v=>!v)}
     aria-label={expanded?'Свернуть FPS':'Подробности FPS'} aria-expanded={expanded}>
     {expanded?'−':'+'}
    </button>
    <button type="button" className="veyra-fps-close" onClick={()=>setVisible(false)} aria-label="Закрыть FPS">×</button>
   </div>
   {expanded&&<div className="veyra-fps-body">
    <div className="veyra-fps-title">VEYRA · WebView <span>{paused?'Пауза':'Измерение'}</span></div>
    <dl className="veyra-fps-stats">
     <div><dt>Среднее FPS (rAF)</dt><dd>{fps||'—'}</dd></div>
     <div><dt>Время кадра p95</dt><dd>{report.p95||'—'} ms</dd></div>
     <div><dt>Время кадра p99</dt><dd>{report.p99||'—'} ms</dd></div>
     <div><dt>Типичный интервал</dt><dd>{report.typicalMs||'—'} ms</dd></div>
     <div><dt>Частота rAF, оценка</dt><dd>{report.estimatedHz?('~'+report.estimatedHz+' Hz'):'—'}</dd></div>
     <div><dt>Пропуски, оценка</dt><dd>{report.skippedIntervals}</dd></div>
     <div><dt>Задачи JS от 50 мс</dt><dd>{longTasks}</dd></div>
     <div><dt>Долгие кадры</dt><dd>{longFrames}</dd></div>
    </dl>
    <div className="veyra-fps-foot">
     <button type="button" onClick={copy}>Копировать отчёт</button>
     <span>{copyState||Math.floor(elapsed)+' с'}</span>
    </div>
    {copyState==='Выдели текст ниже'&&<textarea className="veyra-fps-copy-fallback" readOnly aria-label="Отчёт FPS" value={summary} onFocus={e=>e.target.select()}/>}
    <p>Частота вызовов браузера (rAF), а не измерение физических кадров экрана. 90/120 FPS зависят от Telegram и Android.</p>
   </div>}
  </div>,document.body);
}
