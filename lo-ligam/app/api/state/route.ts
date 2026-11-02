import { getChatGPTUser } from '../../chatgpt-auth';
import { readState,json,error } from '../../../lib/store';
import { project } from '../../../lib/domain.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{const u=await getChatGPTUser();if(!u)return json({error:'Connexion requise.'},401);const row=await readState();if(!row)return json({setup:true,user:{name:u.displayName}});return json({version:row.version,...project(JSON.parse(row.data),u)});}catch(e){return error(e)}}
