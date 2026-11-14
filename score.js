const tracks={board:new Audio('/audio/board.mp3'),harvest:new Audio('/audio/harvest.mp3')};
for(const track of Object.values(tracks))track.loop=true;
tracks.board.volume=.24;tracks.harvest.volume=.29;
const effects=new Map();
const combatCues=new Set(['death','kill','respawn']);
let restoreVolume;
let mode='board',muted=localStorage.getItem('harvest-muted')==='true';
const control=document.createElement('button');
control.className='soundToggle';control.type='button';
function sync(){
 const track=tracks[mode];
 if(muted||document.hidden){for(const audio of Object.values(tracks))audio.pause();return}
 if(track.paused)track.play().catch(()=>{});
}
function label(){control.textContent=muted?'Sound off':'Sound on';control.setAttribute('aria-pressed',String(!muted))}
label();document.body.append(control);
control.onclick=()=>{muted=!muted;localStorage.setItem('harvest-muted',String(muted));if(muted)for(const clip of effects.values())clip.pause();label();sync()};
export function battleMusic(on){
 const next=on?'harvest':'board';if(next===mode)return;
 clearTimeout(restoreVolume);tracks.harvest.volume=.29;tracks[mode].pause();mode=next;if(on)tracks.harvest.currentTime=0;sync()
}
export function playCue(name){
 if(muted||document.hidden)return;
 if(!effects.has(name))effects.set(name,new Audio('/audio/'+name+'.mp3'));
 if(combatCues.has(name)){
   clearTimeout(restoreVolume);tracks.harvest.volume=.11;
   restoreVolume=setTimeout(()=>{tracks.harvest.volume=.29},1150)
 }
 const clip=effects.get(name);clip.volume=combatCues.has(name)?.72:name==='tap'?.2:.45;clip.currentTime=0;clip.play().catch(()=>{})
}
for(const event of ['pointerdown','keydown','visibilitychange'])document.addEventListener(event,sync);
document.addEventListener('click',e=>{if(e.target.closest('button')&&e.target!==control)playCue('tap')});
sync();
