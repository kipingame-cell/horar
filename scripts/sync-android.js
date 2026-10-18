const fs=require('node:fs'),path=require('node:path');
const target='app/src/main/assets/www';fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});fs.cpSync('dist',target,{recursive:true});
// Android's asset packaging may ignore gzip-suffixed files. Keep gzip bytes under .bin.
const data=path.join(target,'data');for(const name of fs.readdirSync(data)){if(name.endsWith('.json.gz'))fs.renameSync(path.join(data,name),path.join(data,name.replace('.json.gz','.bin')));}
console.log('Android assets synchronized, compressed place shards use .bin');
