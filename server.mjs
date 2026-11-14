import {hiddenAt} from './landmarks.mjs';
import {bot} from './bot.mjs';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {fresh,legal,rates,ports,score,act,step,fightInput} from './match.mjs';
const dir=fileURLToPath(new URL('./dist/',import.meta.url)),storage=process.env.CATAN_SAVE||path.join(os.homedir(),'Library','Application Support','Frontier Duel','room.json');
const secret=()=>randomBytes(24).toString('base64url');
fs.mkdirSync(path.dirname(storage),{recursive:true,mode:0o700});
const room=fs.existsSync(storage)?JSON.parse(fs.readFileSync(storage)):{room:secret(),tokens:[secret(),secret()],game:fresh(),joined:[false,false]};
const g=room.game;let dirty=true;const seen=[0,0];
function save(){if(!dirty)return;fs.writeFileSync(storage+'.tmp',JSON.stringify(room),{mode:0o600});fs.renameSync(storage+'.tmp',storage);dirty=false}save();
setInterval(save,900);let last=Date.now();setInterval(()=>{const now=Date.now(),dt=Math.min(.1,(now-last)/1000);last=now;if(g.phase==='harvest'&&g.harvest.eligible.every((yes,p)=>!yes||now-seen[p]<6000)){step(g,dt);dirty=true}},50);
let practiceSeen=0,lastDecision=0;
setInterval(()=>{const game=room.practice,now=Date.now();if(!game||now-practiceSeen>6000)return;
 if(game.phase==='harvest'){bot(game);step(game,.05);dirty=true}
 else if(now-lastDecision>700){lastDecision=now;const rev=game.revision;bot(game);if(game.revision!==rev)dirty=true}
},50);
const demos=new Map();
function demoGame(){const game=fresh();game.phase='setupSettlement';return game}
setInterval(()=>{const now=Date.now();for(const [token,session] of demos){
 if(now-session.seen>3600000){demos.delete(token);continue}
 if(now-session.seen>6000)continue;
 const game=session.game;
 if(game.phase==='harvest'){bot(game);step(game,.05)}
 else if(now-session.decision>700){session.decision=now;bot(game)}
}},50);
function harvestView(g,p){return g.harvest&&{...g.harvest,actors:g.harvest.actors.map((a,i)=>a&&i!==p&&hiddenAt(a.x,a.z)?null:a)}}
function snapshot(p,g=room.game,seenTimes=seen){const {dev,deck,res,...state}=g;const harvest=harvestView(g,p);return {...state,harvest,ports,seat:p,res:res[p],counts:res.map(h=>h.reduce((a,b)=>a+b,0)),dev:dev[p],deckCount:deck.length,online:seenTimes.map(t=>Date.now()-t<6000),rates:rates(g,p),points:[0,1].map(j=>score(g,j,p===j||g.winner!=null)),legal:Object.fromEntries(['Settlement','City','Road'].map(t=>[t,legal(g,p,t)]))}}
const types={'.mp3':'audio/mpeg','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.glb':'model/gltf-binary','.png':'image/png'};
const server=http.createServer(async(req,res)=>{function json(status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
try{const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){if(url.pathname==='/api/local-seat'&&req.method==='POST'&&/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')&&!req.headers['x-forwarded-for']&&!req.headers['cf-connecting-ip']&&!req.headers['forwarded']&&req.headers.origin==='http://'+req.headers.host)return json(200,{token:room.tokens[0]});
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(url.pathname==='/api/demo'&&req.method==='POST'){
   if(demos.has(token))return json(200,{token});
   if(demos.size>=512)return json(503,{error:'Practice rooms are full. Please try again later.'});
   const id=secret();demos.set(id,{game:demoGame(),seen:Date.now(),decision:0});return json(200,{token:id})
 }
 const demo=demos.get(token),p=demo?0:room.tokens.indexOf(token);
 if(p<0)return json(401,{error:'Open your personal seat link.'});
 const practice=!!demo||req.headers['x-practice']==='1';
 if(practice&&p!==0)return json(403,{error:'Host only'});
 if(demo){demo.seen=Date.now();if(demo.game.phase==='won'&&url.pathname==='/api/join')demo.game=demoGame()}
 else if(practice){practiceSeen=Date.now();if(!room.practice||(room.practice.phase==='won'&&url.pathname==='/api/join')){room.practice=demoGame();dirty=true}}else seen[p]=Date.now();
 const g=demo?demo.game:practice?room.practice:room.game,view=()=>snapshot(p,g,practice?[Date.now(),Date.now()]:seen);
 if(url.pathname==='/api/harvest'&&req.method==='GET'){
   if(!g.harvest)return json(200,view());
   return json(200,{partial:true,revision:g.revision,harvest:harvestView(g,p),online:practice?[true,true]:seen.map(t=>Date.now()-t<6000)})
 }
 if(url.pathname==='/api/state'&&req.method==='GET')return json(200,view());
 if(req.method!=='POST')return json(405,{error:'POST required'});let body='';for await(const c of req){body+=c;if(body.length>5000)return json(413,{error:'Too large'})}const b=JSON.parse(body||'{}');
 if(url.pathname==='/api/join'){if(practice)return json(200,view());room.joined[p]=true;if(room.joined.every(Boolean)&&g.phase==='waiting'){g.phase='setupSettlement';g.revision++}dirty=true;save();return json(200,view())}
 if(url.pathname==='/api/input'){fightInput(g,p,b);return json(200,{ok:true})}
 if(url.pathname==='/api/action'){if(b.revision!==g.revision)return json(409,{error:'Board changed. Try again.'});act(g,p,b);g.revision++;if(!demo){dirty=true;save()}return json(200,view())}
 return json(404,{error:'Unknown route'})}
 if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Read only'});
 const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),file=path.resolve(dir,name);
 if(!file.startsWith(path.resolve(dir)+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return json(404,{error:'Not found'});
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res)
}catch(e){json(400,{error:e.message})}});
server.listen(Number(process.env.PORT||8768),'127.0.0.1',()=>console.log('Frontier Duel server ready on loopback.'));
process.on('SIGTERM',()=>{save();process.exit(0)});
