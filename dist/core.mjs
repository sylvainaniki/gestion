export const clone = x => structuredClone(x);
export const progress = d => d.items.length ? Math.round(d.items.filter(i=>i.status==='accepted').length/d.items.length*100) : 0;
export const status = d => d.paused ? 'En pause' : progress(d)===100 ? 'Terminé' : d.items.some(i=>i.status==='submitted') ? 'À valider' : 'En collecte';
export const missing = d => d.items.filter(i=>['missing','revision'].includes(i.status));
export function createDossier(template, name, client, due) {return {id:crypto.randomUUID(),name,client,due,paused:false,templateId:template.id,version:template.version,items:template.fields.map(f=>({...clone(f),id:crypto.randomUUID(),status:'missing',answer:'',comment:'',file:null})),history:[{date:new Date().toISOString(),text:'Dossier créé · modèle v'+template.version}],reminders:[]};}
export function reminder(d,day){if(d.paused||!missing(d).length||d.reminders.includes(day))return false;d.reminders.push(day);d.history.unshift({date:new Date().toISOString(),text:'Relance simulée · '+missing(d).length+' élément(s) à fournir. Aucun email envoyé.'});return true;}
