/** @type {Record<string,string>} */
export const roleLabels={admin:'Administrateur',board:'Bureau',treasurer:'Trésorier',referent:'Référent',member:'Membre de commission',parent:'Bénévole'};
export const scopes=m=>Array.isArray(m.commissions)?m.commissions:[m.commission];
export const viewsScope=(m,c)=>['admin','board'].includes(m.role)||(['referent','member'].includes(m.role)&&scopes(m).includes(c));
export const manages=(m,c)=>viewsScope(m,c)&&(m.role==='admin'||m.permissions?.edit!==false);
export const approves=(m,c)=>viewsScope(m,c)&&(m.role==='admin'||(['board','referent'].includes(m.role)&&m.permissions?.approve!==false));
export const financeScope=(m,c)=>!!m.budget&&(['admin','board','treasurer'].includes(m.role)||scopes(m).includes(c));
export const financeApprove=m=>!!m.budget&&(['admin','treasurer'].includes(m.role)||m.permissions?.financeApprove===true);
export const financeEdit=m=>!!m.budget&&(m.role==='admin'||m.permissions?.financeEdit!==false);
export const categories=['Fonctionnement','Événement','Matériel','Communication','Alimentation','Transport','Adhésions','Dons','Subventions','Autre'];
/** @type {Record<string,string>} */
export const financeLabels={draft:'Brouillon',submitted:'À valider',approved:'Validé',rejected:'Refusé',paid:'Réglé',void:'Annulé'};
