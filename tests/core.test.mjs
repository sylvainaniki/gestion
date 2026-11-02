import test from 'node:test';
import assert from 'node:assert/strict';
import {createDossier,progress,status,reminder} from '../dist/core.mjs';
const template=()=>({id:'a',version:1,fields:[{label:'Brief',type:'text'},{label:'Logo',type:'file'}]});
test('un changement de modèle ne modifie pas les dossiers ouverts',()=>{const t=template(),d=createDossier(t,'Projet','Client','2026-11-12');t.fields[0].label='Autre';t.version++;assert.equal(d.items[0].label,'Brief');assert.equal(d.version,1)});
test('progression fondée sur les validations, pas les dépôts',()=>{const d=createDossier(template(),'P','C','');d.items[0].status='submitted';assert.equal(progress(d),0);assert.equal(status(d),'À valider');d.items[0].status='accepted';assert.equal(progress(d),50);d.items[1].status='accepted';assert.equal(status(d),'Terminé')});
test('relances locales idempotentes et suspendues en pause ou sans éléments manquants',()=>{const d=createDossier(template(),'P','C','');assert.equal(reminder(d,'2026-11-02'),true);assert.equal(reminder(d,'2026-11-02'),false);d.paused=true;assert.equal(reminder(d,'2026-11-03'),false);d.paused=false;d.items.forEach(i=>i.status='submitted');assert.equal(reminder(d,'2026-11-03'),false)});
