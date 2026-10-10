import React from 'react';
import {Button,Logo} from './UI.jsx';
export function Welcome({onStart}){return <main className="welcome"><div className="welcome-brand"><Logo width={190}/></div><div className="welcome-message"><h1>знакомства<br/>начинаются здесь</h1><p>Находи людей рядом, общайся легко<br/>и создавай настоящие связи</p></div><div className="welcome-footer"><Button className="full" onClick={onStart}>начать знакомиться</Button><p>Продолжая, ты принимаешь <a href="/legal" target="_blank" rel="noreferrer">условия и политику</a> VEYRA</p></div></main>}
