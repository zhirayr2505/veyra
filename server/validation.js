import {z} from 'zod';
import {validBirth,fail} from './core.js';
const short=(n)=>z.string().trim().min(1).max(n);
export const id=z.string().regex(/^\d{1,16}$/);
export const uuid=z.string().uuid();
export const profileFields=z.object({name:short(50).regex(/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u),birth_date:z.string().refine(validBirth,'AGE_18_REQUIRED'),gender:z.enum(['man','woman']),looking_for:z.array(z.enum(['man','woman'])).min(1).max(2),bio:z.string().trim().max(1000),interests:z.array(short(30)).max(12),smoking:z.enum(['','no','sometimes','yes']).default(''),leisure:z.enum(['','active','quiet','depends']).default(''),goal:z.enum(['relationship','dating','friends','unsure','friendship','flirt','casual','travel']),city:short(100),country:short(100),lat:z.number().min(-90).max(90),lon:z.number().min(-180).max(180),min_age:z.number().int().min(18).max(110),max_age:z.number().int().min(18).max(110),radius_km:z.number().int().min(1).max(20000),languages:z.array(z.enum(['ru','en','hy','es','fr','de','it','pt','tr','ar','uk','ka','az','kk','uz','fa','hi','zh','ja','ko','pl','nl'])).max(5).default([]),prompts:z.array(z.object({key:z.enum(['first_date','laugh','unique','weekend','dream','surprise','value','conversation','travel','green_flag']),answer:z.string().trim().min(1).max(240)})).max(3).default([]),height_cm:z.number().int().min(120).max(230).nullable().default(null)});
export const profileSchema=profileFields.extend({consent:z.literal(true)}).refine(p=>p.max_age>=p.min_age);
export function parse(schema,input){const r=schema.safeParse(input);if(!r.success)fail(400,'VALIDATION_ERROR');return r.data;}
export {z,short};

