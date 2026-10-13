import React from 'react';
// Original path geometry transcribed from VEYRA_PROFILE_MASTER_FINAL.zip (02–05 SVG sets).
// Inline vectors inherit the actual button/chip color; no crystals, baked PNG UI or icon font.
const glyph={
 gift:<><rect x="3" y="8" width="18" height="4" rx="1.2"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></>,
 heart:<path d="M20.4 5.1a5.25 5.25 0 0 0-7.4 0L12 6.2l-1-1.1a5.25 5.25 0 0 0-7.4 7.4L12 21l8.4-8.5a5.25 5.25 0 0 0 0-7.4Z"/>,
 star:<path d="m12 2 2.9 6.3 6.9.9-5.1 4.8 1.3 6.8-6-3.3-6 3.3 1.3-6.8-5.1-4.8 6.9-.9L12 2Z"/>,
 chat:<><path d="M21 11.2a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.6-5a9 9 0 1 1 16.4-4.8Z"/><path d="M7.5 10.8h9M7.5 14.2h5.7"/></>,
 courtship:<><path d="M11.5 21v-7M8.2 16.4c-3.8-2.2-5.4.5-5.4.5 1.7 3.5 5 3.4 8.7 3.4M12 15.6c2.8-3 5.2-2.5 7.8-2.3-.4 3.4-3.1 5.7-7.8 4.4M12 12.5 6.2 7a3 3 0 1 1 4.2-4.2L12 4.3l1.6-1.5A3 3 0 1 1 17.8 7L12 12.5Z"/></>,
 books:<path d="M12 5c-3-2-6-2-9-1v16c3-1 6-1 9 1m0-16c3-2 6-2 9-1v16c-3-1-6-1-9 1V5Z"/>,
 travel:<path d="m21 3-6.5 18-3.2-7.3L4 10.5 21 3ZM11.3 13.7 21 3"/>,
 art:<><path d="M20.8 12.7A9 9 0 1 0 12 21h1a2 2 0 0 0 1.3-3.5c-1.5-1.5-.5-3.5 1.7-3.5h2a3 3 0 0 0 2.8-1.3Z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="6.7" cy="14.7" r="1"/></>,
 music:<><path d="M9 17V5l11-2v12M9 8l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>,
 sports:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c6.2 2.6 6.2 10.2 0 12.8M18.4 5.6c-6.2 2.6-6.2 10.2 0 12.8"/></>,
 coffee:<><path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM16 9h2a3 3 0 0 1 0 6h-2M3 22h16M7 2v3M12 2v3"/></>,
 movies:<><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 9 2 5l18-3 1 4L3 9ZM7 4l2 4M13 3l2 4M3 13h18"/></>,
 nature:<path d="M20 3c-9-2-18 3-16 10 1.6 5.3 7.8 6.5 12 2 3.7-4 3.5-8 4-12ZM4 21 15 9M8 17v-5"/>,
 animals:<><path d="M7 15c2-4 8-4 10 0 1 1.7 3 3.2 2 5-1.7 3-4.5-.5-7-.5S6.2 23 5 20c-1-1.8 1-3.3 2-5Z"/><circle cx="4.5" cy="10" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19.5" cy="10" r="2"/></>,
 photography:<><path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4Z"/><circle cx="12" cy="13" r="4"/></>,
 technology:<><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></>,
 gaming:<><path d="M7 7h10c2.5 0 3.6 1.6 4 4l1 6a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2l1-6c.4-2.4 1.5-4 4-4Z"/><path d="M6 12h4M8 10v4M16 11h.01M18.5 13.5h.01"/></>,
 food:<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 2-5 6-5 10h5"/>,
 fitness:<path d="M7 12h10M3 9v6M7 6v12M17 6v12M21 9v6M3 12h4M17 12h4"/>,
 dance:<><circle cx="13" cy="4" r="2"/><path d="m4 8 7 2 6-3 3 2M11 10l-2 5 7 2 3 4M9 15l-4 6M13 9l2 5"/></>,
 relationships:<><path d="M12 20 4.6 13a5 5 0 1 1 7.4-6.7A5 5 0 1 1 19.4 13L12 20Z"/><path d="m8.7 12 2.2 2.2 4.4-4.4"/></>,
 about:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
 photos:<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/></>,
 gifts:<><rect x="4" y="9" width="16" height="12" rx="2"/><path d="M3 9h18M12 9v12M12 9c-8.5 0-8.2-7-4-6 2 .5 3 3.5 4 6Zm0 0c8.5 0 8.2-7 4-6-2 .5-3 3.5-4 6Z"/></>,
 common:<><circle cx="8" cy="10" r="5"/><circle cx="16" cy="14" r="5"/><path d="m9.5 14 5-4"/></>,
 goal:<><circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 9-9M16 3v5h5"/></>
};
export function VeyraPackIcon({name,size=21,className='',filled=false}){
 return <svg className={'vx-pack-icon '+className} width={size} height={size} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyph[name]||glyph.heart}</svg>;
}
export function interestGlyph(label){
 const v=String(label||'').toLocaleLowerCase('ru');
 if(/путешеств|поездк|самол|город/.test(v))return 'travel';
 if(/книг|чтени/.test(v))return 'books';
 if(/искус|рисов|дизайн|творч/.test(v))return 'art';
 if(/музык|песн|концерт/.test(v))return 'music';
 if(/спорт|футбол|теннис|бокс/.test(v))return 'sports';
 if(/кофе|чай/.test(v))return 'coffee';
 if(/кино|фильм|сериал/.test(v))return 'movies';
 if(/природ|прогул/.test(v))return 'nature';
 if(/питом|соба|кош|животн/.test(v))return 'animals';
 if(/фото|камер/.test(v))return 'photography';
 if(/технол|программ|гаджет/.test(v))return 'technology';
 if(/игр|гейм/.test(v))return 'gaming';
 if(/еда|кулинар|кухн/.test(v))return 'food';
 if(/фитнес|тренаж/.test(v))return 'fitness';
 if(/танц/.test(v))return 'dance';
 return 'relationships';
}
