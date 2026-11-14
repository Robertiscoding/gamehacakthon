import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const origin=new URL(process.argv[2]);
if(origin.protocol!=='https:')throw Error('Supply the public HTTPS origin for this server.');
const file=process.env.CATAN_SAVE||path.join(os.homedir(),'Library','Application Support','Frontier Duel','room.json');
const {tokens}=JSON.parse(fs.readFileSync(file,'utf8'));
console.log(origin.origin+'/#'+tokens[1]);
