const music=new Audio('/audio/harvest.mp3');
music.loop=true;music.volume=.29;
const effects=new Map();let active=false,muted=localStorage.getItem('harvest-muted')==='true';
function sync(){if(active&&!muted&&!document.hidden)music.play().catch(()=>{});else music.pause()}
export function battleMusic(on){active=on;if(on)music.currentTime=0;sync()}
export function playCue(name){if(muted||document.hidden)return;if(!effects.has(name))effects.set(name,new Audio('/audio/'+name+'.mp3'));const clip=effects.get(name);clip.volume=.46;clip.currentTime=0;clip.play().catch(()=>{})}
export function soundButton(){const b=document.createElement('button');function label(){b.textContent=muted?'Sound off':'Sound on';b.setAttribute('aria-pressed',String(!muted))}label();b.onclick=()=>{muted=!muted;localStorage.setItem('harvest-muted',String(muted));label();sync()};b.style.cssText='position:absolute;right:12px;top:12px;z-index:10';return b}
for(const event of ['pointerdown','keydown','visibilitychange'])document.addEventListener(event,sync);
