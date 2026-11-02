import {AppError} from './domain.mjs';
export async function atomicMutation(read,write,fn){for(let attempt=0;attempt<8;attempt++){const row=await read();if(!row)throw new AppError('Initialisez votre association.',409);const result=fn(JSON.parse(row.data));if(await write(row.version,result.state))return result;}throw new AppError('Plusieurs modifications simultanées. Réessayez.',409);}
