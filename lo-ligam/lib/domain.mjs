export class AppError extends Error {constructor(message,status=422){super(message);this.status=status;}}
const fail=(m,s=422)=>{throw new AppError(m,s)};
const text=(v,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('Champ obligatoire ou trop long.');return v.trim()};
const optional=(v,max=4000)=>{if(v===undefined||v===null)return '';if(typeof v!=='string'||v.length>max)fail('Texte invalide ou trop long.');return v.trim()};
const choice=(v,allowed)=>allowed.includes(v)?v:fail('Valeur non autorisée.');
const stamp=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const dated=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(v)||!Number.isFinite(Date.parse(v)))fail('Date invalide.');return new Date(v).toISOString()};
const integer=(v,min=0,max=100000000)=>Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):fail('Nombre invalide.');
export const member=(s,u)=>{const m=s.members.find(m=>m.id===u.userId&&m.active);if(!m)fail('Votre accès à cette association n’est pas actif.',403);return m};
export const manages=(m,c)=>m.role==='admin'||(['referent','member'].includes(m.role)&&m.commission===c);
export const approves=(m,c)=>m.role==='admin'||(m.role==='referent'&&m.commission===c);
const admin=m=>{if(m.role!=='admin')fail('Action réservée à l’administration.',403)};
const requireManage=(m,c)=>{if(!manages(m,c))fail('Action non autorisée dans cette commission.',403)};
const requireApprove=(m,c)=>{if(!approves(m,c))fail('Validation réservée au référent.',403)};
const get=(arr,id)=>arr.find(x=>x.id===id)||fail('Élément introuvable.',404);
const version=(o,c)=>{if(c.version!==(o.version||1))fail('Une autre personne a modifié cet élément. Rechargez avant de recommencer.',409)};
const writable=e=>{if(['archived','cancelled'].includes(e.status))fail('Cet événement est fermé.',409)};
export const visibleEvent=(m,e)=>manages(m,e.commission)||(['published','finished'].includes(e.status)&&e.audience==='parents');
const eventFor=(s,m,eventId)=>{const e=get(s.events,eventId);if(!visibleEvent(m,e))fail('Événement introuvable.',404);return e};
export function relativeDate(start,offset){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(start));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const date=new Date(Date.UTC(+p.year,+p.month-1,+p.day));date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);}
export function initialState(u){return {name:'Lo Ligam',members:[{id:u.userId,name:u.fullName||'Administrateur',email:u.email.toLowerCase(),role:'admin',commission:'__general',active:true,family:false,budget:false}],commissions:[],events:[],tasks:[],slots:[],registrations:[],communications:[],resources:[],families:[],budget:[],materials:[],invites:[],notifications:[],audit:[],receipts:[],templates:[],defaultsCleared:true};}
const commission=(s,value)=>value==='__general'?{id:'__general',name:'Sans commission'}:get(s.commissions,value);
export function project(s,u){const m=member(s,u),events=s.events.filter(e=>visibleEvent(m,e)),eventIds=new Set(events.map(e=>e.id));const managementIds=new Set(events.filter(e=>manages(m,e.commission)).map(e=>e.id));return {name:s.name,defaultsCleared:!!s.defaultsCleared,me:m,commissions:s.commissions,templates:s.templates,events,slots:s.slots.filter(x=>eventIds.has(x.eventId)),registrations:s.registrations.filter(r=>eventIds.has(get(s.slots,r.slotId).eventId)).map(r=>({id:r.id,slotId:r.slotId,userId:r.userId===m.id?r.userId:undefined,mine:r.userId===m.id,name:managementIds.has(get(s.slots,r.slotId).eventId)?get(s.members,r.userId).name:get(s.members,r.userId).name.split(' ')[0]})),tasks:s.tasks.filter(t=>managementIds.has(t.eventId)),communications:s.communications.filter(c=>manages(m,c.commission)),resources:s.resources.filter(r=>r.audience==='parents'||manages(m,r.commission)),families:m.family?s.families:[],budget:m.budget?s.budget.filter(b=>managementIds.has(b.eventId)):[],materials:s.materials.filter(b=>managementIds.has(b.eventId)),members:m.role==='admin'?s.members:[],invites:m.role==='admin'?s.invites.map(({hash,...x})=>x):[],audit:m.role==='admin'?s.audit.slice(-50).reverse():[],notifications:s.notifications.filter(n=>n.userId===m.id).slice(-40).reverse()};}
function notify(s,userId,message){s.notifications.push({id:id(),userId,message,date:stamp()})}
export function apply(original,u,c){const s=structuredClone(original);const m=member(s,u);if(s.receipts.some(x=>x.id===c.requestId&&x.user===u.userId))return {state:s,replayed:true};text(c.requestId,100);const p=c.payload||{};let result={};
if(c.type==='event.create'){requireManage(m,p.commission);commission(s,p.commission);const start=dated(p.start),end=dated(p.end);if(end<=start)fail('La fin doit suivre le début.');const e={id:id(),title:text(p.title),start,end,location:text(p.location),commission:p.commission,audience:'parents',status:'draft',description:optional(p.description),report:'',version:1,owner:m.id};s.events.push(e);if(p.template){const t=get(s.templates,p.template);t.tasks.forEach((title,i)=>s.tasks.push({id:id(),eventId:e.id,title,due:relativeDate(start,t.offsets[i]||0),status:'todo',owner:'',reason:'',version:1}));}result={id:e.id};}
else if(c.type==='event.status'){const e=eventFor(s,m,c.id);requireApprove(m,e.commission);version(e,c);const transitions={draft:['preparing','cancelled'],preparing:['published','cancelled'],published:['finished','cancelled'],finished:['archived'],archived:[],cancelled:[]};choice(p.status,transitions[e.status]);if(p.status==='finished'&&Date.now()<Date.parse(e.end))fail('La clôture est possible après la fin de l’événement.');if(p.status==='archived'&&!e.report)fail('Ajoutez un bilan avant l’archivage.');e.status=p.status;e.version++;if(p.status==='cancelled'){for(const r of s.registrations.filter(r=>get(s.slots,r.slotId).eventId===e.id))notify(s,r.userId,'Un événement auquel vous participez a été annulé.');}}
else if(c.type==='event.report'){const e=eventFor(s,m,c.id);requireApprove(m,e.commission);writable(e);version(e,c);e.report=text(p.report,4000);e.version++;}
else if(c.type==='task.create'){const e=eventFor(s,m,p.eventId);requireManage(m,e.commission);writable(e);s.tasks.push({id:id(),eventId:e.id,title:text(p.title),due:text(p.due,10),status:'todo',owner:'',reason:'',version:1});}
else if(c.type==='task.update'){const t=get(s.tasks,c.id),e=eventFor(s,m,t.eventId);requireManage(m,e.commission);writable(e);version(t,c);t.status=choice(p.status,['todo','doing','blocked','done']);t.reason=t.status==='blocked'?text(p.reason,500):'';if(p.claim)t.owner=m.id;t.version++;}
else if(c.type==='slot.create'){const e=eventFor(s,m,p.eventId);requireManage(m,e.commission);writable(e);const start=dated(p.start),end=dated(p.end);if(end<=start||start<e.start||end>e.end)fail('Le créneau doit se situer dans les horaires de l’événement.');s.slots.push({id:id(),eventId:e.id,title:text(p.title),start,end,capacity:integer(p.capacity,1,100),version:1});}
else if(c.type==='slot.join'){const slot=get(s.slots,c.id),e=eventFor(s,m,slot.eventId);if(e.status!=='published'||Date.parse(slot.end)<=Date.now())fail('Les inscriptions ne sont pas ouvertes.',409);if(s.registrations.some(r=>r.slotId===slot.id&&r.userId===m.id))return {state:s,replayed:true};if(s.registrations.filter(r=>r.slotId===slot.id).length>=slot.capacity)fail('Ce créneau vient d’être rempli.',409);for(const r of s.registrations.filter(r=>r.userId===m.id)){const other=get(s.slots,r.slotId),event=get(s.events,other.eventId);if(event.status!=='cancelled'&&other.start<slot.end&&other.end>slot.start)fail('Vous avez déjà un engagement à cet horaire.',409)}s.registrations.push({id:id(),slotId:slot.id,userId:m.id,date:stamp()});notify(s,m.id,'Votre inscription à une mission est confirmée.');}
else if(c.type==='slot.leave'){const r=get(s.registrations,c.id);if(r.userId!==m.id)fail('Vous pouvez retirer uniquement votre inscription.',403);const slot=get(s.slots,r.slotId),e=eventFor(s,m,slot.eventId);s.registrations=s.registrations.filter(x=>x.id!==r.id);if(Date.parse(slot.start)-Date.now()<48*3600000)notify(s,e.owner,'Un bénévole vient de se désister à moins de 48 heures de sa mission.');}
else if(c.type==='communication.create'){requireManage(m,p.commission);commission(s,p.commission);s.communications.push({id:id(),commission:p.commission,title:text(p.title),channel:choice(p.channel,['Mail','WhatsApp','Réseaux sociaux','Affiche']),version:1,revisions:[{id:id(),fr:text(p.fr,10000),oc:optional(p.oc,10000),status:'draft',approvals:[],date:stamp(),distributions:[]}]});}
else if(c.type.startsWith('communication.')){const co=get(s.communications,c.id);requireManage(m,co.commission);version(co,c);let r=co.revisions.at(-1);if(c.type==='communication.revise'){co.revisions.push({id:id(),fr:text(p.fr,10000),oc:optional(p.oc,10000),status:'draft',approvals:[],date:stamp(),distributions:[]})}else if(c.type==='communication.submit'){if(r.status!=='draft')fail('Cette révision a déjà été soumise.',409);r.status='review';}else if(c.type==='communication.approve'){requireApprove(m,co.commission);if(r.status!=='review')fail('Cette révision n’attend pas de relecture.',409);const lang=choice(p.language,['fr','oc']);if(lang==='oc'&&!r.oc)fail('Aucun texte occitan à valider.');if(!r.approvals.some(a=>a.language===lang))r.approvals.push({language:lang,userId:m.id,date:stamp()});if(r.approvals.some(a=>a.language==='fr')&&(!r.oc||r.approvals.some(a=>a.language==='oc')))r.status='approved';}else if(c.type==='communication.distribute'){requireApprove(m,co.commission);if(r.status!=='approved')fail('Validez toutes les langues de cette révision avant diffusion.',409);r.distributions.push({userId:m.id,date:stamp(),channel:co.channel});r.status='distributed';}else fail('Commande inconnue.');co.version++;}
else if(c.type==='resource.create'){requireManage(m,p.commission);commission(s,p.commission);const url=optional(p.url,2000);if(url&&!/^https:\/\//i.test(url))fail('Le lien doit commencer par https://');s.resources.push({id:id(),title:text(p.title),category:choice(p.category,['Accueil','Événements','Communication','Procédures','Passation']),commission:p.commission,audience:choice(p.audience,['commission','parents']),body:optional(p.body,10000),url,version:1,owner:m.id,date:stamp()});}
else if(c.type==='material.create'){const e=eventFor(s,m,p.eventId);requireManage(m,e.commission);writable(e);s.materials.push({id:id(),eventId:e.id,title:text(p.title),needed:integer(p.needed,1,10000),confirmed:0,returned:false,version:1});}
else if(c.type==='material.update'){const x=get(s.materials,c.id),e=eventFor(s,m,x.eventId);requireManage(m,e.commission);writable(e);version(x,c);x.confirmed=integer(p.confirmed,0,x.needed);x.returned=!!p.returned;x.version++;}
else if(c.type==='budget.create'){if(!m.budget)fail('Habilitation budget requise.',403);const e=eventFor(s,m,p.eventId);requireManage(m,e.commission);writable(e);s.budget.push({id:id(),eventId:e.id,title:text(p.title),kind:choice(p.kind,['expense','income']),planned:integer(p.planned),actual:p.actual===''||p.actual===null?null:integer(p.actual),version:1});}
else if(c.type==='family.create'){if(!m.family)fail('Habilitation accueil confidentiel requise.',403);const contact=text(p.contact,150);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)&&!/^[+\d ().-]{8,25}$/.test(contact))fail('Saisissez un email ou téléphone valide.');s.families.push({id:id(),name:text(p.name,100),contact,stage:'Demande reçue',next:optional(p.next,10),owner:m.id,version:1});}
else if(c.type==='family.update'){if(!m.family)fail('Habilitation accueil confidentiel requise.',403);const f=get(s.families,c.id);version(f,c);f.stage=choice(p.stage,['Demande reçue','Contact pris','Visite prévue','Informations transmises','Accueil réalisé','Sans suite']);f.version++;}
else if(c.type==='invite.create'){admin(m);const email=text(p.email,200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Email invalide.');commission(s,p.commission);s.invites.push({id:id(),email,role:choice(p.role,['parent','member','referent']),commission:p.commission,hash:text(p.hash,64),expires:new Date(Date.now()+7*86400000).toISOString(),used:false});}
else if(c.type==='member.update'){admin(m);const target=get(s.members,c.id);if(target.id===m.id)fail('Votre propre accès ne peut pas être modifié ici.');target.active=!!p.active;target.role=choice(p.role,['parent','member','referent','admin']);target.family=!!p.family;target.budget=!!p.budget;commission(s,p.commission);target.commission=p.commission;notify(s,m.id,'Les habilitations d’un membre ont été modifiées et journalisées.');}
else if(c.type==='commission.create'){admin(m);s.commissions.push({id:id(),name:text(p.name,80),version:1});}
else if(c.type==='settings.update'){admin(m);s.name=text(p.name,80);}
else if(c.type==='template.create'){admin(m);const tasks=text(p.tasks,3000).split('\n').map(x=>x.trim()).filter(Boolean);s.templates.push({id:id(),name:text(p.name,80),tasks,offsets:tasks.map(()=>-7),version:1});}
else if(c.type==='settings.cleanDefaults'){
 admin(m);
 const defaults={coac:'Accueil · COAC',communication:'Communication',festejadas:'Festejadas'};
 s.commissions=s.commissions.filter(x=>defaults[x.id]!==x.name);
 s.templates=s.templates.filter(x=>!((x.id==='portes'&&x.name==='Portes ouvertes')||(x.id==='accueil'&&x.name==='Soirée d’accueil')));
 // Keep historical scope IDs on existing records and members: removal must not widen access.
 s.defaultsCleared=true;
}
else if(c.type==='event.update'){
 const e=eventFor(s,m,c.id);requireManage(m,e.commission);writable(e);version(e,c);
 const start=dated(p.start),end=dated(p.end);if(end<=start)fail('La fin doit suivre le début.');
 const slots=s.slots.filter(x=>x.eventId===e.id);
 if((start!==e.start||end!==e.end)&&slots.length)fail('Les horaires ne peuvent pas être déplacés tant que des créneaux existent. Les engagements doivent être préservés.',409);
 e.title=text(p.title);e.location=text(p.location);e.description=optional(p.description);e.start=start;e.end=end;e.version++;
 for(const userId of new Set(s.registrations.filter(r=>slots.some(x=>x.id===r.slotId)).map(r=>r.userId)))notify(s,userId,'Les informations d’un événement auquel vous participez ont changé.');
}
else if(c.type==='event.duplicate'){
 const old=eventFor(s,m,c.id);requireManage(m,old.commission);
 const start=dated(p.start),end=dated(p.end);if(end<=start)fail('La fin doit suivre le début.');
 const e={id:id(),title:text(p.title),location:old.location,description:'',commission:old.commission,audience:old.audience,status:'draft',start,end,owner:m.id,report:'',version:1};s.events.push(e);
 for(const task of s.tasks.filter(t=>t.eventId===old.id))s.tasks.push({id:id(),eventId:e.id,title:task.title,due:relativeDate(start,-7),status:'todo',reason:'',owner:'',priority:'normal',version:1});
 for(const material of s.materials.filter(t=>t.eventId===old.id))s.materials.push({id:id(),eventId:e.id,title:material.title,needed:material.needed,confirmed:0,returned:false,version:1});
 result={id:e.id};
}
else if(c.type==='task.edit'){
 const t=get(s.tasks,c.id),e=eventFor(s,m,t.eventId);requireManage(m,e.commission);writable(e);version(t,c);
 t.title=text(p.title);if(!/^\d{4}-\d{2}-\d{2}$/.test(p.due)||!Number.isFinite(Date.parse(p.due)))fail('Échéance invalide.');t.due=p.due;
 t.priority=choice(p.priority,['low','normal','high']);t.version++;
}
else if(c.type==='notification.read'){
 if(c.id){const n=get(s.notifications,c.id);if(n.userId!==m.id)fail('Notification introuvable.',404);n.readAt=stamp();}
 else for(const n of s.notifications.filter(n=>n.userId===m.id))n.readAt=stamp();
}
else if(c.type==='invite.revoke'){admin(m);const inv=get(s.invites,c.id);inv.revoked=true;}
else if(c.type==='resource.favorite'){
 const r=get(s.resources,c.id);if(r.audience!=='parents'&&!manages(m,r.commission))fail('Ressource introuvable.',404);
 m.favorites=m.favorites||[];m.favorites=m.favorites.includes(r.id)?m.favorites.filter(x=>x!==r.id):[...m.favorites,r.id];
}
else if(c.type==='resource.update'){
 const r=get(s.resources,c.id);requireManage(m,r.commission);version(r,c);
 const url=optional(p.url,2000);if(url&&!/^https:\/\//i.test(url))fail('Le lien doit commencer par https://');
 r.history=r.history||[];r.history.push({version:r.version,title:r.title,body:r.body,url:r.url,date:r.date});
 r.title=text(p.title);r.body=optional(p.body,10000);r.url=url;r.version++;r.date=stamp();
}
else if(c.type==='commission.rename'){admin(m);const x=get(s.commissions,c.id);version(x,c);x.name=text(p.name,80);x.version=(x.version||1)+1;}
else if(c.type==='commission.remove'){
 admin(m);get(s.commissions,c.id);
 if(s.members.some(x=>x.active&&x.role!=='admin'&&x.commission===c.id)||s.events.some(x=>x.commission===c.id)||s.communications.some(x=>x.commission===c.id)||s.resources.some(x=>x.commission===c.id)||s.invites.some(x=>!x.used&&!x.revoked&&x.commission===c.id))fail('Cette commission est utilisée. Retirez ou réaffectez ses éléments avant suppression.',409);
 s.commissions=s.commissions.filter(x=>x.id!==c.id);
}
else if(c.type==='template.update'){
 admin(m);const t=get(s.templates,c.id);version(t,c);const lines=text(p.tasks,3000).split('\n').map(x=>x.trim()).filter(Boolean);
 const offset=integer(p.days,0,365);t.name=text(p.name,80);t.tasks=lines;t.offsets=lines.map(()=>-offset);t.version=(t.version||1)+1;
}
else if(c.type==='template.remove'){admin(m);get(s.templates,c.id);s.templates=s.templates.filter(x=>x.id!==c.id);}
else if(c.type==='export'){requireApprove(m,m.commission);result={export:project(s,u)};}
else fail('Commande inconnue.');
s.audit.push({id:id(),actor:m.name,action:c.type,date:stamp()});s.receipts.push({id:c.requestId,user:u.userId});s.receipts=s.receipts.slice(-500);if(JSON.stringify(s).length>3000000)fail('Limite de ce pilote atteinte. Exportez et contactez l’administrateur.',409);return {state:s,result};}
export function acceptInvite(original,u,hash){const s=structuredClone(original);const invite=s.invites.find(i=>i.hash===hash&&!i.used&&!i.revoked&&i.email===u.email.toLowerCase()&&Date.parse(i.expires)>Date.now());if(!invite)fail('Invitation expirée, déjà utilisée ou associée à un autre email.',403);if(s.members.some(m=>m.id===u.userId))fail('Ce compte possède déjà un accès. Contactez un administrateur.',409);s.members.push({id:u.userId,email:u.email.toLowerCase(),name:u.fullName||u.email.split('@')[0],role:invite.role,commission:invite.commission,active:true,family:false,budget:false});invite.used=true;s.audit.push({id:id(),actor:u.fullName||u.userId,action:'Invitation acceptée',date:stamp()});return s;}
