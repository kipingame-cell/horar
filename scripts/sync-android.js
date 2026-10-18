const fs=require('node:fs');fs.mkdirSync('app/src/main/assets',{recursive:true});fs.cpSync('dist','app/src/main/assets/www',{recursive:true});console.log('Android assets synchronized');
