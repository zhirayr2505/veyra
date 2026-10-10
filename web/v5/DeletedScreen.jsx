import React from 'react';
import {Logo} from './UI.jsx';
export function DeletedScreen({onClose}){
 return <main className="deleted-screen" role="status">
  <div className="deleted-screen-content">
   <Logo width={140}/>
   <div className="deleted-heart" aria-hidden="true"><span>♡</span><i>✦</i></div>
   <h1>Нам жаль, что ты уходишь</h1>
   <p>Твой аккаунт VEYRA удалён.</p>
   <p>Спасибо, что был частью нашей истории. Если захочешь вернуться, мы будем рады снова тебя увидеть.</p>
  </div>
  <div className="deleted-screen-footer"><button type="button" className="btn primary full" onClick={onClose}>Выйти из приложения</button></div>
 </main>;
}
