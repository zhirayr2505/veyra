/* VEYRA 2.0 — migration helper. Import after syncing assets into public/veyra-v2/ */
export const assetBase='/veyra-v2/';
export const v2Asset=(category,name,variant='outline')=>
 category==='icons'?assetBase+'icons/'+variant+'/'+name+'.svg':
 assetBase+category+'/'+name+'.svg';
export const tabs=[
 {id:'search',title:'Поиск',icon:'search'},
 {id:'encounters',title:'Знакомства',icon:'encounters'},
 {id:'likes',title:'Симпатии',icon:'heart'},
 {id:'chats',title:'Чаты',icon:'chat'},
 {id:'profile',title:'Профиль',icon:'user'}
];
export const emptyArt={
 search:'no-search',encounters:'no-profiles',likes:'no-likes',
 matches:'no-matches',chats:'no-chats',profile:'no-photos',
 gifts:'no-gifts',notifications:'no-notifications',offline:'offline',
 error:'error',moderation:'moderation'
};
