import {financeScope,financeApprove,financeEdit,categories} from './permissions.mjs';
export function financeCommand(s,m,c,h){
 const {fail,text,optional,integer,choice,version,get,id,stamp,notify}=h,p=c.payload||{};
 const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Date invalide.');return v};
 const money=v=>{if(v===''||v===null||v===undefined)fail('Montant obligatoire.');return integer(v,0,100000000)};
 const open=year=>{if((s.closedYears||[]).includes(year))fail('Cet exercice est clôturé. Un administrateur doit le rouvrir.',409)};
 const scope=b=>b.eventId?get(s.events,b.eventId).commission:b.commission||'__general';
 const access=b=>{if(!financeScope(m,scope(b)))fail('Accès financier refusé.',403)};
 const editor=()=>{if(!financeEdit(m))fail('Droit de saisie financière requis.',403)};
 if(c.type==='finance.year'){
  if(m.role!=='admin'||!m.budget)fail('Administration et habilitation budget requises.',403);
  const year=String(integer(p.year,2000,2200));s.closedYears=s.closedYears||[];
  if(p.closed){if(s.budget.some(b=>(b.date||s.events.find(e=>e.id===b.eventId)?.start||'').slice(0,4)===year&&['submitted','approved'].includes(b.status)))fail('Traitez les opérations en attente avant clôture.',409);s.closedYears=[...new Set([...s.closedYears,year])];}
  else {text(p.reason,500);s.closedYears=s.closedYears.filter(y=>y!==year)}
  return {};
 }
 if(c.type==='finance.limit'){
  if(!financeApprove(m))fail('Droit de validation financière requis.',403);const year=String(integer(p.year,2000,2200));open(year);
  const commission=p.commission||'__general';if(commission!=='__general')get(s.commissions,commission);if(!financeScope(m,commission))fail('Périmètre refusé.',403);
  s.budgetLimits=s.budgetLimits||[];const existing=s.budgetLimits.find(x=>x.year===year&&x.commission===commission);if(existing){if(c.id!==existing.id)fail('Un plafond existe déjà. Rechargez puis modifiez-le.',409);version(existing,c);existing.amount=money(p.amount);existing.version++;}else {if(c.id)fail('Plafond introuvable.',409);s.budgetLimits.push({id:id(),year,commission,amount:money(p.amount),version:1})}return {};
 }
 if(['reimbursement.revise','reimbursement.withdraw'].includes(c.type)){
  const b=get(s.budget,c.id);if(!b.reimbursement||b.owner!==m.id)fail('Demande introuvable.',404);version(b,c);open(b.date.slice(0,4));if(!['submitted','rejected'].includes(b.status))fail('Cette demande est déjà validée ou réglée.',409);
  const previous={...b,history:undefined,changedBy:m.name,changedAt:stamp()};
  if(c.type==='reimbursement.withdraw'){b.status='void';b.reason='Retirée par le demandeur';}
  else {const receipt=text(p.receipt,2000);if(!/^https:\/\//i.test(receipt))fail('Lien HTTPS requis.');const actual=money(p.actual);if(actual<=0)fail('Montant positif requis.');b.title=text(p.title);b.actual=actual;b.receipt=receipt;b.note=optional(p.note,2000);b.reason='';b.status='submitted';}
  b.version++;b.history=b.history||[];b.history.push(previous);return {};
 }
 if(['finance.create','finance.update','reimbursement.create','budget.create'].includes(c.type)){
  const reimbursement=c.type==='reimbursement.create';let b=c.type==='finance.update'?get(s.budget,c.id):null;
  if(b){access(b);editor();version(b,c);open((b.date||get(s.events,b.eventId).start).slice(0,4));if(!['draft','rejected'].includes(b.status||'draft'))fail('Seuls les brouillons et refus peuvent être modifiés.',409);}
  if(!reimbursement)editor();
  const eventId=optional(p.eventId,100),event=eventId?get(s.events,eventId):null;
  const commission=event?event.commission:(p.commission||'__general');
  if(!event&&commission!=='__general')get(s.commissions,commission);
  if(reimbursement){if(!event||!(['published','finished'].includes(event.status)&&event.audience==='parents')&&!h.viewsScope(m,commission))fail('Choisissez un événement accessible.',403);}
  else if(!financeScope(m,commission))fail('Périmètre financier refusé.',403);
  const day=date(p.date||event?.start.slice(0,10));open(day.slice(0,4));
  const receipt=optional(p.receipt,2000);if(receipt&&!/^https:\/\//i.test(receipt))fail('Le justificatif doit être un lien HTTPS.');
  const actual=p.actual===''||p.actual==null?null:money(p.actual);
  const values={eventId,commission,title:text(p.title),kind:(reimbursement||b?.reimbursement)?'expense':choice(p.kind,['expense','income']),planned:money(p.planned),actual,date:day,due:p.due?date(p.due):'',category:choice(p.category||'Autre',categories),payee:optional(p.payee,200),note:optional(p.note,2000),receipt};
  if(reimbursement&&(actual===null||actual<=0||!receipt))fail('Montant réel positif et lien justificatif requis pour un remboursement.');
  if(b){b.history=b.history||[];const {history,...previous}=b;b.history.push({...previous,changedBy:m.name,changedAt:stamp()});Object.assign(b,values);b.status='draft';b.version++;}
  else {b={...values,id:id(),owner:m.id,ownerName:m.name,reimbursement,status:reimbursement?'submitted':'draft',version:1,history:[],createdAt:stamp()};s.budget.push(b)}
  if(reimbursement)for(const a of s.members.filter(a=>a.active&&financeApprove(a)&&financeScope(a,commission)))notify(s,a.id,'Une demande de remboursement attend votre validation.');
  return {id:b.id};
 }
 const b=get(s.budget,c.id);access(b);version(b,c);open((b.date||get(s.events,b.eventId).start).slice(0,4));
 const prev={...b,history:undefined,changedBy:m.name,changedAt:stamp()};const status=b.status||'draft';
 if(c.type==='finance.transition'){
  const next=choice(p.status,['submitted','approved','rejected','paid','void','draft']);
  const transitions={draft:['submitted','void'],submitted:['approved','rejected','draft'],approved:['paid','void'],rejected:['draft','void'],paid:[],void:[]};if(!transitions[status]?.includes(next))fail('Transition financière impossible.',409);
  if(['approved','rejected','paid','void'].includes(next)){if(!financeApprove(m))fail('Validation financière requise.',403);if(b.reimbursement&&b.owner===m.id&&next==='approved')fail('Une autre personne doit valider votre remboursement.',403)}else editor();
  if(['rejected','void'].includes(next))b.reason=text(p.reason,500);
  if(next==='paid'){if(b.actual===null||b.actual===undefined)fail('Renseignez le montant réel avant validation.');b.paidDate=date(p.paidDate);open(b.paidDate.slice(0,4));b.paymentMethod=choice(p.paymentMethod,['Virement','Carte','Espèces','Chèque','Autre']);b.reference=optional(p.reference,200);}
  if(next==='approved'){if(b.actual==null)fail('Le montant réel est requis avant validation.');b.approvedBy=m.name;b.approvedAt=stamp();}
  b.status=next;b.version++;b.history=b.history||[];b.history.push(prev);if(b.owner)notify(s,b.owner,'Opération « '+b.title+' » : '+({submitted:'soumise',approved:'validée',rejected:'refusée',paid:'réglée',void:'annulée',draft:'brouillon'}[next])+'.');return {};
 }
 fail('Commande financière inconnue.');
}
export function financeProjection(s,m){return {budget:s.budget.filter(b=>financeScope(m,b.eventId?s.events.find(e=>e.id===b.eventId)?.commission:b.commission||'__general')),reimbursements:s.budget.filter(b=>b.reimbursement&&b.owner===m.id),closedYears:s.closedYears||[],budgetLimits:(s.budgetLimits||[]).filter(x=>financeScope(m,x.commission))};}
