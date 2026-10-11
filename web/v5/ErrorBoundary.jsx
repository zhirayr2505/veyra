import React from 'react';
export class ErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error){console.error('VEYRA interface crash',error?.name||'Error')}
 render(){
  if(!this.state.failed)return this.props.children;
  return <main className="error-recovery" role="alert">
   <img src="/veyra-v2/brand/veyra-wordmark-purple.svg" width="152" alt="VEYRA"/>
   <span aria-hidden="true">♡</span>
   <h1>Что-то пошло не так</h1>
   <p>Мы не смогли отобразить этот экран. Твоя анкета и переписки остаются на сервере.</p>
   <button type="button" className="btn primary" onClick={()=>window.location.reload()}>перезапустить VEYRA</button>
   <p className="error-hint">Если ошибка повторяется, напиши в поддержку через @VeyraAppBot.</p>
  </main>;
 }
}
