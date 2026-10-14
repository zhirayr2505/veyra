/** Visual metadata for a profile interest; independent of list position.
 * Reuse the existing onboarding catalogue as the semantic source of truth.
 * No scroll handlers, image mutation, or runtime style measurement.
 */
export const normalizeInterest=value=>String(value??'').trim().toLocaleLowerCase('ru-RU');

const GROUP_TONES={
 'Музыка':'violet','Кино и развлечения':'violet',
 'Активность':'sky','Спорт и движение':'sky',
 'Культура':'rose','Искусство и творчество':'rose',
 'Путешествия':'mint','Природа и питомцы':'mint',
 'Вкус и стиль':'amber','Еда и напитки':'amber',
 'Образ жизни':'iris','Технологии и игры':'iris',
 'Саморазвитие':'teal','Город и встречи':'teal'
};
export function interestTone(label,groups=[]){
 const key=normalizeInterest(label);
 const group=groups.find(group=>group.items?.some(value=>normalizeInterest(value)===key));
 return GROUP_TONES[group?.title]||'violet';
}
export function sharedInterestSet(interests=[],viewerInterests=[]){
 const mine=new Set(viewerInterests.map(normalizeInterest).filter(Boolean));
 return new Set(interests.map(normalizeInterest).filter(value=>mine.has(value)));
}
