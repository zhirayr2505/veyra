import React from 'react';
export const graphicRoot='/graphics';
export function Artwork({name,className='',size=180}){
 const [failed,setFailed]=React.useState(null);
 const src=failed===name?`${graphicRoot}/placeholders/state-error.svg`:`${graphicRoot}/illustrations/${name}-512.webp`;
 return <img className={'artwork '+className} src={src} onError={()=>setFailed(name)} width={size} height={size} alt="" decoding="async" draggable={false}/>;
}
export function Brand({large=false,animated=false}){
 return <div className={`brand approved-brand ${large?'large':'brand-horizontal'} ${animated?'brand-animated':''}`} aria-label="VEYRA">{large?<img src={`${graphicRoot}/brand/veyra-approved-512.webp`} width={240} height={240} alt="VEYRA" fetchPriority="high"/>:<><span className="brand-symbol" aria-hidden="true"><img src={`${graphicRoot}/brand/veyra-approved-256.webp`} width={80} height={80} alt="" fetchPriority="high"/></span><span className="brand-wordmark" aria-hidden="true">VEYRA</span></>}{animated&&<span className="brand-glint" aria-hidden="true"/>}</div>;
}
export function SectionHeading({eyebrow,title,body,art}){
 return <header className="section-heading"><div>{eyebrow&&<span className="section-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{body&&<p>{body}</p>}</div>{art&&<Artwork name={art} size={88}/>}</header>;
}
export function UIIcon({name,size=24,...props}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="veyra-icon" aria-hidden="true" {...props}><use href={`${graphicRoot}/icons/veyra-icons.sprite.svg#veyra-icon-${name}`}/></svg>;
}

/* One icon API: prefer VEYRA's licensed sprite; normalize missing glyphs. */
const veyraAliases={
 Layers:'feed',Sparkles:'today',Heart:'like',MessageCircle:'chats',UserRound:'profile',
 X:'close',Star:'super-like',Gift:'gift',Crown:'premium',Zap:'boost',
 Settings:'settings',Search:'search',ChevronLeft:'back',ArrowLeft:'back',
 ChevronRight:'next',ArrowRight:'arrow-right',ChevronDown:'chevron-down',
 SlidersHorizontal:'filters',MoreHorizontal:'more',Plus:'plus',
 Check:'check',CheckCircle2:'check-circle',Send:'send',Image:'photo',
 Camera:'camera',Download:'download',Upload:'upload',Trash2:'trash',
 Flag:'report',Lock:'lock',ShieldCheck:'shield',BadgeCheck:'reviewed',
 EyeOff:'incognito',Eye:'eye',Bell:'bell',CalendarDays:'calendar',
 Globe:'globe',MapPin:'location',Sun:'sun',Sunset:'sunset',Moon:'moon',
 Coffee:'coffee',Footprints:'walk',Utensils:'dinner',Film:'cinema',
 Music:'music',Plane:'travel',Dumbbell:'sport',PawPrint:'pets',
 Users:'users',Copy:'copy',LogOut:'logout',Pause:'pause',Play:'play',
 LoaderCircle:'loader',RotateCcw:'refresh',RotateCw:'refresh',
 Clock:'clock',ArrowUpRight:'external-link',Ticket:'receipt',Mic:'mic',MicOff:'mic-off',Reply:'reply',CheckCheck:'check-check',Sticker:'sticker',Images:'images',ImagePlus:'photo',Pencil:'edit',Ban:'block',AlertCircle:'alert',Paperclip:'attachment',Smile:'smile',ArrowDown:'arrow-down',ArrowUp:'arrow-up',Grip:'more'
};
const veyraGlyphs=new Set('feed today likes chats profile like skip super-like boost premium filters location compass globe search back next chevron-down arrow-right external-link close plus check check-circle more settings send attachment smile photo camera upload download edit trash report lock shield reviewed incognito eye unlimited gift copy share logout pause play bell bell-off calendar sun sunset moon flame coffee walk dinner date cinema music travel sport pets users heart-handshake loader refresh offline alert help block clock read link dashboard chart clipboard receipt document mic mic-off reply check-check sticker images arrow-down arrow-up'.split(' '));
export function VeyraIcon({name,icon:Icon,size=24,className='',...props}){
 const iconName=Icon?.displayName||Icon?.name||'';
 const glyph=name||veyraAliases[iconName];
 if(glyph&&veyraGlyphs.has(glyph))return <UIIcon name={glyph} size={size} className={'veyra-icon '+className} {...props}/>;
 return Icon?<Icon size={size} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={'veyra-icon veyra-icon-fallback '+className} aria-hidden="true" {...props}/>:null;
}

/* Shared VEYRA primitives; the existing classes preserve tested styles and actions. */
export function VeyraButton({children,type='button',className='',disabled=false,...props}){
 return <button type={type} className={'button '+className} disabled={disabled} {...props}>{children}</button>;
}
export function VeyraPanel({title,children,className='',as:Tag='section',...props}){
 return <Tag className={'account-panel '+className} {...props}>{title&&<h2>{title}</h2>}{children}</Tag>;
}
export function VeyraEmptyState({art='discover-cards',title,body,children,className=''}){
 return <div className={'empty veyra-empty-feature '+className}><Artwork name={art} size={146}/>{title&&<h2>{title}</h2>}{body&&<p>{body}</p>}{children}</div>;
}
