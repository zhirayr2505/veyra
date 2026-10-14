/** Configure existing Telegram bots independently of Render's startup/health gate.
 * An occasional Telegram setWebhook error must not kill a healthy web server.
 * Retries are bounded in frequency and do not create long-lived promises. */
export function scheduleBotSetup(run,{setTimer=setTimeout,clearTimer=clearTimeout,logger=console,initialDelayMs=1000}={}){
 let stopped=false,timer=null,failures=0;
 const schedule=delay=>{
  if(stopped)return;
  timer=setTimer(()=>{void attempt()},delay);
  timer?.unref?.();
 };
 const attempt=async()=>{
  if(stopped)return;
  timer=null;
  try{
   await run();
   failures=0;
   logger.info?.('Telegram bot configuration confirmed');
  }catch(error){
   if(stopped)return;
   failures++;
   const retryMs=Math.min(600000,15000*2**Math.min(failures-1,6));
   // Do not include tokens, URLs or Telegram API response bodies in logs.
   logger.error?.('Telegram bot setup failed; web server remains available; retry scheduled',{
    reason:error?.code||error?.name||'Telegram API error',retryMs,failures
   });
   schedule(retryMs);
  }
 };
 schedule(initialDelayMs);
 return ()=>{stopped=true;if(timer!==null)clearTimer(timer)};
}
