import React,{useState} from 'react';
import {post} from './api.js';
import {CompletionScreen} from './CompletionScene.jsx';
import {ProfilePreview} from './ProfilePreview.jsx';
export function Moderation({profile,photos=[],refresh}){
 const [preview,setPreview]=useState(false),[editing,setEditing]=useState(false),[error,setError]=useState('');
 const revise=async()=>{if(editing)return;setEditing(true);setError('');try{await post('/profile/revise',{});await refresh();}catch(e){setError(e.message);setEditing(false)}};
 if(preview)return <ProfilePreview profile={profile} photos={photos} submitted onBack={()=>setPreview(false)} onEdit={revise} submitting={editing} error={error}/>;
 return <CompletionScreen kind={profile?.moderation==='rejected'?'rejected':'pending'} reason={profile?.moderation_reason||''} onRefresh={refresh} onPreview={()=>setPreview(true)} onEdit={revise} busy={editing} error={error}/>;
}
