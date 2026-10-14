import {database,migrate} from '../server/db.js';
import {storage} from '../server/integrations.js';
import {backfillPhotoPlaceholders} from '../server/photo-placeholder.js';

const db=database(process.env.DATABASE_URL);
try{
 await migrate(db);
 const s=storage(process.env);
 const batch=Number(process.env.LQIP_BATCH_SIZE||12);
 const result=await backfillPhotoPlaceholders({db,storage:s,limit:Math.min(25,Math.max(1,batch))});
 console.log('Photo placeholder backfill',JSON.stringify(result));
}finally{await db.close()}
