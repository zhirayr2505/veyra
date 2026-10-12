import React from 'react';
import {CompletionScreen} from './CompletionScene.jsx';
export function Moderation({profile,refresh}){
 const kind=profile?.moderation==='rejected'?'rejected':'pending';
 return <CompletionScreen kind={kind} reason={profile?.moderation_reason||''} onRefresh={refresh}/>;
}
