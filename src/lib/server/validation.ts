import Ajv from 'ajv';
const ajv = new Ajv({allErrors:true});
const text = {type:'string',maxLength:200000};
const timestamp = {type:'number',minimum:0,maximum:8640000000000000};
const optionalText = {type:['string','null'],maxLength:200000};
const record = (required:string[], properties:Record<string,unknown>) => ({type:'object',required,properties,additionalProperties:true});
const entry = record(['id','body','createdAt','updatedAt'], {id:{type:'string',minLength:1,maxLength:100},body:text,title:optionalText,mood:optionalText,createdAt:timestamp,updatedAt:timestamp,deletedAt:{type:['number','null'],minimum:0},userId:text});
const syncValidator = ajv.compile({type:'array',maxItems:10000,items:entry});
export function validateSyncEntries(value:unknown): asserts value is Array<{id:string;body:string;title?:string;mood?:string;createdAt:number;updatedAt:number;deletedAt?:number|null}> {
  if (!syncValidator(value)) throw new Error('Dữ liệu nhật ký không hợp lệ.');
}
const backupValidator = ajv.compile(record(['version','users','entries','feedbacks','sessions'], {
  version:{enum:[2]},
  users:{type:'array',maxItems:100000,items:record(['id','email','name','role','status','passwordHash','salt','createdAt'],{id:text,email:text,name:text,role:{enum:['admin','user']},status:{enum:['active','suspended']},passwordHash:text,salt:text,createdAt:timestamp})},
  entries:{type:'array',maxItems:100000,items:{...entry,required:['id','userId','body','createdAt','updatedAt','wordCount','syncedAt'],properties:{...entry.properties,wordCount:{type:'number',minimum:0},syncedAt:timestamp}}},
  feedbacks:{type:'array',maxItems:100000,items:record(['id','userName','rating','category','comment','createdAt'],{id:text,userName:text,rating:{type:'integer',minimum:1,maximum:5},category:{enum:['peace','music','visuals','journal','general']},comment:text,createdAt:timestamp})},
  sessions:{type:'array',maxItems:100000,items:record(['id','sessionId','durationSeconds','pageViews','device','startTime','lastPingAt'],{id:text,sessionId:text,durationSeconds:{type:'number',minimum:0},pageViews:{type:'number',minimum:0},device:{enum:['desktop','mobile','tablet']},startTime:timestamp,lastPingAt:timestamp})},
  settings:record(['id','siteName','allowRegistration','updatedAt'],{id:{const:'system'},siteName:text,allowRegistration:{type:'boolean'},updatedAt:timestamp})
}));
export function validateServerBackup(value:unknown): void {
  if (!backupValidator(value)) throw new Error('Cấu trúc hoặc phiên bản sao lưu không hợp lệ.');
}
