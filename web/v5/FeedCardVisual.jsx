import React from 'react';
import {Photo} from './UI.jsx';
import {CardCaption,CardPhotoBars,CardGoalBadge} from './DatingCardLayers.jsx';
import './Discover.css';

/** One visual card for live discovery and read-only onboarding preview. */
export function FeedCardVisual({card,index=0,onIndex,location,preview=false,onProfile}){
 const ids=card?.photos||[],id=ids[index];
 return <>
  <div className="feed-picture">
   <Photo id={id} className="feed-picture-current" alt={card?.name||''} priority resolution={960}
    placeholder={card?.photo_placeholders?.[String(id)]}/>
  </div>
  <div className="veyra-card-shade" aria-hidden="true"/>
  <CardPhotoBars photos={ids} index={index} onSelect={onIndex||(()=>{})}/>
  <CardGoalBadge goal={card?.goal} top/>
  {card?.test_profile&&!preview&&<span className="vx-demo-feed-badge">ДЕМО</span>}
  <CardCaption profile={card} age={card?.age} location={location||card?.city} preview={preview} onProfile={onProfile}/>
 </>;
}
