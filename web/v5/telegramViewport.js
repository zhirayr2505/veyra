/**
 * Telegram native fullscreen, safe areas and viewport.
 * Falls back cleanly to expand() on older Telegram versions.
 *
 * Vertical swipes are a Telegram OS-level mini-app dismissal gesture:
 * do NOT preventDefault(touchmove), which would also break the native
 * profile scroll and its elastic pull.
 */
export function enableTelegramFullscreen(tg){
 if(!tg?.initData)return ()=>{};
 const root=document.documentElement;
 let unsupported=false;
 const disableNativeDismiss=()=>{
  try{
   if(tg.isVersionAtLeast?.('7.7'))tg.disableVerticalSwipes?.();
  }catch{/* Older clients may not implement this method; keep scrolling. */}
 };
 const update=()=>{
  const safe=tg.safeAreaInset||{};
  const content=tg.contentSafeAreaInset||{};
  root.style.setProperty('--tg-safe-area-inset-top',Math.max(0,Number(safe.top)||0)+'px');
   root.style.setProperty('--tg-content-safe-area-inset-top',Math.max(0,Number(content.top)||0)+'px');
   root.style.setProperty('--veyra-telegram-status-top',Math.max(0,Number(safe.top)||0)+'px');
  const top=Math.max(0,Number(safe.top)||0,Number(content.top)||0);
  const bottom=Math.max(0,Number(safe.bottom)||0,Number(content.bottom)||0);
  root.style.setProperty('--veyra-telegram-top',top+'px');
  root.style.setProperty('--veyra-telegram-bottom',bottom+'px');
  root.classList.toggle('veyra-telegram-fullscreen',Boolean(tg.isFullscreen));
 };
 const ask=()=>{
  try{tg.ready?.()}catch{}
  try{tg.expand?.()}catch{/* Some clients ignore expand. */}
  disableNativeDismiss();
  try{
   if(!unsupported&&tg.isVersionAtLeast?.('8.0')&&typeof tg.requestFullscreen==='function'&&!tg.isFullscreen){
    tg.requestFullscreen();
   }
  }catch{/* Telegram may decline fullscreen; keep expanded fallback. */}
 };
 const changed=()=>{disableNativeDismiss();update()};
 const failed=event=>{if(event?.error==='UNSUPPORTED')unsupported=true;disableNativeDismiss();update()};
 const events=[['fullscreenChanged',changed],['fullscreenFailed',failed],['safeAreaChanged',changed],['contentSafeAreaChanged',changed],['viewportChanged',changed]];
 for(const [name,fn] of events)try{tg.onEvent?.(name,fn)}catch{}
 update();ask();
 // Some clients only allow fullscreen after an actual user gesture.
 const onFirstTap=()=>{if(!tg.isFullscreen&&!unsupported)ask()};
 document.addEventListener('pointerdown',onFirstTap,{once:true,capture:true,passive:true});
 return ()=>{
  document.removeEventListener('pointerdown',onFirstTap,true);
  for(const [name,fn] of events)try{tg.offEvent?.(name,fn)}catch{}
  root.classList.remove('veyra-telegram-fullscreen');
  // Intentionally NEVER enable vertical dismiss here: another screen may
  // already be mounted, and a late cleanup must not undo this app policy.
 };
}
