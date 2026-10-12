import React,{Suspense,useRef,useState} from 'react';
import {Smile,Lightbulb,PenLine} from 'lucide-react';
import './BioStep.css';
const EmojiPicker=React.lazy(()=>import('emoji-picker-react'));
const limit=257;
const chars=value=>Array.from(String(value||''));
export function BioStep({value='',onChange}){
 const [emojiOpen,setEmojiOpen]=useState(false);
 const ref=useRef(null);
 const update=text=>onChange(chars(text).slice(0,limit).join(''));
 const addEmoji=emoji=>{
  const area=ref.current;
  const start=area?.selectionStart??value.length,end=area?.selectionEnd??value.length;
  const inserted=value.slice(0,start)+emoji.emoji+value.slice(end);
  const capped=chars(inserted).slice(0,limit).join('');
  onChange(capped);
  setEmojiOpen(false);
  requestAnimationFrame(()=>{area?.focus();const at=Math.min(capped.length,start+emoji.emoji.length);area?.setSelectionRange(at,at)});
 };
 return <section className="veyra-bio-step" aria-label="Немного о себе">
  <div className="veyra-bio-intro"><div className="veyra-bio-symbol"><PenLine size={27}/></div><h2>Твоя история начинается здесь</h2><p>Пиши так, как говоришь в жизни. Даже пара предложений помогут найти своего человека.</p></div>
  <div className="veyra-bio-panel">
   <div className="veyra-bio-topline"><strong>О себе</strong><span>Необязательно</span></div>
   <textarea ref={ref} aria-label="О себе" rows={6} value={value} onChange={e=>update(e.target.value)} placeholder="Чем увлекаешься? Как проводишь свободное время? Что тебя вдохновляет?" spellCheck/>
   <div className="veyra-bio-tools"><button type="button" className={'veyra-bio-emoji-button'+(emojiOpen?' active':'')} onClick={()=>setEmojiOpen(v=>!v)} aria-expanded={emojiOpen} aria-label="Добавить эмодзи"><Smile size={20}/> Эмодзи</button><span className="veyra-bio-counter" aria-live="polite">{chars(value).length}/{limit}</span></div>
   {emojiOpen&&<div className="veyra-bio-emoji-panel" aria-label="Выбор эмодзи"><Suspense fallback={<p>Загружаем эмодзи…</p>}><EmojiPicker onEmojiClick={addEmoji} height={300} width="100%" searchDisabled={false} skinTonesDisabled lazyLoadEmojis/></Suspense></div>}
  </div>
  <div className="veyra-bio-inspiration"><Lightbulb size={18}/><p><strong>О чём можно рассказать?</strong><span>Хобби, любимый отдых, настроение или то, что делает тебя тобой.</span></p></div>
 </section>;
}
