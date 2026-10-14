/** Central optional Telegram feedback: never throws outside Mini Apps. */
export function haptic(kind='selection'){
 try{
  const api=window.Telegram?.WebApp?.HapticFeedback;
  if(kind==='selection')api?.selectionChanged?.();
  else if(kind==='error'||kind==='success')api?.notificationOccurred?.(kind);
  else api?.impactOccurred?.(kind==='medium'?'medium':'light');
 }catch{/* Desktop browsers and older Telegram clients are supported. */}
}
