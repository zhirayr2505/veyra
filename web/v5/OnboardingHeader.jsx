import React from 'react';
import {Logo,Icon} from './UI.jsx';

/** Shared onboarding chrome. Telegram owns its native back button in fullscreen. */
export function OnboardingHeader({step=null,onBack,disabled=false,preview=false,total=8}){
 const canGoBack=typeof onBack==='function'&&!disabled;
 return <header className={'veyra-onboarding-fixed-header veyra-shared-onboarding-header'+(preview?' veyra-preview-onboarding-header':'')}>
  <div className="step-top"><button type="button" aria-label="Назад" className="quiet" onClick={onBack} disabled={!canGoBack}><Icon name="back"/></button><span/><span/></div>
  <div className="center-logo veyra-shine-logo"><Logo width={136}/></div>
  {step!=null&&<div className="progress" aria-label={'Шаг '+step+' из '+total}>{Array.from({length:total},(_,i)=>i+1).map(n=><span key={n} className={(n<=step?'done ':'')+(n===step?'current':'')} aria-current={n===step?'step':undefined}/>)}</div>}
 </header>;
}