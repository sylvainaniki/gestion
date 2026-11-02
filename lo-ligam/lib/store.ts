import { env } from 'cloudflare:workers';
import { AppError } from './domain.mjs';
import { atomicMutation } from './transaction.mjs';
const org = 'coac';
export async function readState() {return env.DB!.prepare('SELECT version, data FROM organizations WHERE id = ?').bind(org).first<{version:number,data:string}>();}
export async function commitState(old:number,data:unknown) {const result=await env.DB!.prepare('UPDATE organizations SET version = version + 1, data = ?, updated_at = ? WHERE id = ? AND version = ?').bind(JSON.stringify(data),new Date().toISOString(),org,old).run();return result.meta.changes===1;}
export async function initialize(data:unknown) {const result=await env.DB!.prepare('INSERT OR IGNORE INTO organizations (id,version,data,updated_at) VALUES (?,1,?,?)').bind(org,JSON.stringify(data),new Date().toISOString()).run();if(!result.meta.changes)throw new AppError('L’association a déjà été initialisée.',409);}
export async function mutate(fn:(s:any)=>any){return atomicMutation(readState,commitState,fn);}
export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export function error(e:any){return json({error:e instanceof AppError?e.message:'Le serveur ne peut pas enregistrer cette action. Réessayez.',code:e.status||500},e.status||500)}
