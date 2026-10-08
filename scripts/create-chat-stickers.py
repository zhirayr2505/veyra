"""Original VEYRA static vector sticker packs. No third-party artwork or emoji assets."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
packs=[('hearts','Симпатия','Hearts',['Ты мне нравишься','Обнимаю','Скучаю','Это мэтч','Моё сердце','Поцелуй']),('cosmic','Настроение','Cosmic mood',['Привет!','Вау!','Ты космос','Ну всё…','Огонь!','Спокойной ночи']),('coffee','Кофе вдвоём','Coffee date',['Пойдём на кофе?','Доброе утро','Жду тебя','Сладкая жизнь','На свидание?','Договорились'])]
colors=[('#ffa5ca','#dc4f91','#642a5c'),('#d7beff','#9671d3','#4a326c'),('#a4e8df','#59aca9','#325a6f'),('#fac3a4','#d88976','#734256'),('#bdbfff','#8185d5','#453c71'),('#ffc1d9','#d681ad','#713953')]
items=[];manifest=[]
for pack,ru,en,labels in packs:
 manifest.append({'id':pack,'name':ru,'name_en':en})
 for i,label in enumerate(labels):
  ident=f'{pack}-{i+1}';a,b,c=colors[i];rotate=[-8,6,-4,9,-6,4][i]
  defs=f'<defs><linearGradient id="body" x2=".8" y2="1"><stop stop-color="{a}"/><stop offset=".6" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient><linearGradient id="rim" x2="1" y2="1"><stop stop-color="#fff5fb"/><stop offset="1" stop-color="#edc5e7"/></linearGradient><radialGradient id="shine"><stop stop-color="#fff" stop-opacity=".68"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#24132f" flood-opacity=".22"/></filter></defs>'
  deco='<path d="M74 95v27m-14-14h28M411 230v20m-10-10h20" stroke="#ead2ee" stroke-width="7" stroke-linecap="round"/><circle cx="411" cy="83" r="9" fill="'+a+'"/><circle cx="68" cy="286" r="6" fill="#f7d0df"/>'
  if pack=='hearts':
   shape='<path d="M256 332C209 298 106 239 106 160C106 88 193 58 256 129C319 58 406 88 406 160C406 239 303 298 256 332Z" fill="url(#body)" stroke="url(#rim)" stroke-width="11" stroke-linejoin="round"/><ellipse cx="172" cy="132" rx="48" ry="26" fill="url(#shine)" transform="rotate(-29 172 132)"/><path d="M290 282c32-21 57-48 70-71" fill="none" stroke="'+a+'" stroke-width="7" opacity=".32" stroke-linecap="round"/>'
  elif pack=='cosmic':
   shape='<path d="M256 68Q264 68 272 87L304 146L379 153Q404 156 385 178L335 229L347 303Q351 329 327 317L256 281L185 317Q161 329 165 303L177 229L127 178Q108 156 133 153L208 146L240 87Q248 68 256 68Z" fill="url(#body)" stroke="url(#rim)" stroke-width="11" stroke-linejoin="round"/><ellipse cx="236" cy="133" rx="55" ry="40" fill="url(#shine)"/><path d="M96 303Q60 260 130 233M363 122Q440 127 424 177" fill="none" stroke="'+a+'" stroke-width="8" stroke-linecap="round" opacity=".65"/>'
  else:
   shape='<path d="M348 149h24c76 0 76 103-2 105h-26" fill="none" stroke="#f4e1ed" stroke-width="27"/><path d="M347 151h25c70 0 69 99-24 91" fill="none" stroke="'+b+'" stroke-width="13"/><path d="M119 132h238v126q0 71-119 71t-119-71Z" fill="url(#body)" stroke="url(#rim)" stroke-width="11"/><ellipse cx="238" cy="133" rx="117" ry="29" fill="#56374a" stroke="url(#rim)" stroke-width="10"/><ellipse cx="238" cy="133" rx="89" ry="18" fill="#c99583"/><path d="M226 131c-21-22-41 3 12 13 53-10 33-35 12-13l-12 8Z" fill="#fae6c9"/><path d="M182 85q-26-18 0-43m59 40q-23-20 0-42m58 46q-23-19 0-40" fill="none" stroke="#ecd2e5" stroke-width="7" stroke-linecap="round" opacity=".7"/><ellipse cx="175" cy="211" rx="43" ry="62" fill="url(#shine)"/><ellipse cx="238" cy="338" rx="146" ry="15" fill="'+c+'" stroke="#ecd2e5" stroke-width="6"/>'
  cx=238 if pack=='coffee' else 256;ey=221 if pack=='coffee' else 206
  if i%3==0:eyes=f'<path d="M{cx-46} {ey}q12-14 24 0m44 0q12-14 24 0" fill="none" stroke="#4b2845" stroke-width="9" stroke-linecap="round"/>'
  elif i%3==1:eyes=f'<ellipse cx="{cx-35}" cy="{ey}" rx="8" ry="12" fill="#402943"/><path d="M{cx+23} {ey}q12-12 24 0" fill="none" stroke="#402943" stroke-width="8" stroke-linecap="round"/>'
  else:eyes=f'<ellipse cx="{cx-35}" cy="{ey}" rx="8" ry="12" fill="#402943"/><ellipse cx="{cx+35}" cy="{ey}" rx="8" ry="12" fill="#402943"/><circle cx="{cx-37}" cy="{ey-4}" r="2.5" fill="#fff"/><circle cx="{cx+33}" cy="{ey-4}" r="2.5" fill="#fff"/>'
  face=eyes+f'<path d="M{cx-17} {ey+26}q17 20 34 0" fill="none" stroke="#4b2845" stroke-width="7" stroke-linecap="round"/><ellipse cx="{cx-55}" cy="{ey+20}" rx="17" ry="8" fill="#d44477" opacity=".35"/><ellipse cx="{cx+55}" cy="{ey+20}" rx="17" ry="8" fill="#d44477" opacity=".35"/>'
  size=29 if len(label)>16 else 33
  lettering=f'<g transform="rotate({-rotate/2} 256 398)"><rect x="40" y="358" width="432" height="79" rx="35" fill="#211b30" stroke="#f1d5ea" stroke-width="7"/><text x="256" y="407" text-anchor="middle" font-family="Arial,sans-serif" font-size="{size}" font-weight="700" fill="#f9e9f5">{label}</text></g><text x="256" y="468" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="5" fill="#e3bbd5">VEYRA</text>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="{label}">{defs}{deco}<g filter="url(#shadow)" transform="rotate({rotate} 256 205)">{shape}{face}</g>{lettering}</svg>'
  (root/'public/graphics/stickers'/f'{ident}.svg').write_text(svg)
  items.append({'id':ident,'pack':pack,'label':label,'format':'static','src':f'/graphics/stickers/{ident}.svg','width':512,'height':512})
(root/'shared/chat-stickers.json').write_text(json.dumps({'version':1,'packs':manifest,'stickers':items},ensure_ascii=False,indent=2)+'\n')
(root/'public/graphics/stickers/LICENSE.txt').write_text('Original VEYRA vector sticker artwork, 2026. Created for this project.\nNo Telegram, Apple or third-party sticker/emoji artwork is included.\nProject owner may use, modify and distribute these assets with VEYRA.\n')
