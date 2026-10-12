/**
 * Telegram native fullscreen, safe areas and viewport.
 * Falls back cleanly to expand() on older Telegram versions.
 */
export function enableTelegramFullscreen(tg){
 if(!tg?.initData)return ()=>{};
 const root=document.documentElement;
 let unsupported=false;
 const update=()=>{
  const safe=tg.safeAreaInset||{};
  const content=tg.contentSafeAreaInset||{};
  const top=Math.max(0,Number(safe.top)||0,Number(content.top)||0);
  const bottom=Math.max(0,Number(safe.bottom)||0,Number(content.bottom)||0);
  root.style.setProperty('--veyra-telegram-top',top+'px');
  root.style.setProperty('--veyra-telegram-bottom',bottom+'px');
  root.classList.toggle('veyra-telegram-fullscreen',Boolean(tg.isFullscreen));
 };
 const ask=()=>{
  try{
   tg.expand?.();
   if(!unsupported&&tg.isVersionAtLeast?.('8.0')&&typeof tg.requestFullscreen==='function'&&!tg.isFullscreen){
    tg.requestFullscreen();
   }
  }catch{ /* Telegram may decline fullscreen, so keep expanded fallback. */ }
 };
 const changed=()=>update();
 const failed=event=>{if(event?.error==='UNSUPPORTED')unsupported=true;update();};
 const events=[['fullscreenChanged',changed],['fullscreenFailed',failed],['safeAreaChanged',changed],['contentSafeAreaChanged',changed],['viewportChanged',changed]];
 for(const [name,fn] of events)try{tg.onEvent?.(name,fn)}catch{}
 update();ask();
 // Some clients only allow fullscreen after an actual user gesture.
 const onFirstTap=()=>{if(!tg.isFullscreen&&!unsupported)ask();};
 document.addEventListener('pointerdown',onFirstTap,{once:true,capture:true,passive:true});
 return ()=>{
  document.removeEventListener('pointerdown',onFirstTap,true);
  for(const [name,fn] of events)try{tg.offEvent?.(name,fn)}catch{}
  root.classList.remove('veyra-telegram-fullscreen');
 };
}
