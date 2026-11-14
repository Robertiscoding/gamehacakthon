const tracks={board:new Audio('/audio/board.mp3'),harvest:new Audio('/audio/harvest.mp3')};
for(const track of Object.values(tracks))track.loop=true;
const saved=Number(localStorage.getItem('frontier-volume')??100);
let master=Number.isFinite(saved)?Math.max(0,Math.min(100,saved))/100:1;
let harvestLevel=.29;
function effectLevel(name){return combatCues.has(name)?.72:name==='tap'?.2:.45}
function mix(){
 tracks.board.volume=.24*master;tracks.harvest.volume=harvestLevel*master;
 for(const [name,clip] of effects)clip.volume=effectLevel(name)*master
}
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
const panel=document.createElement('div');panel.className='soundPanel';
const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value=String(Math.round(master*100));slider.setAttribute('aria-label','Master volume');
const level=document.createElement('output');
function showLevel(){level.textContent=slider.value+'%';slider.setAttribute('aria-valuetext',level.textContent)}
slider.oninput=()=>{master=Number(slider.value)/100;localStorage.setItem('frontier-volume',slider.value);mix();showLevel()};
label();showLevel();mix();panel.append(control,slider,level);document.body.append(panel);
control.onclick=()=>{muted=!muted;localStorage.setItem('harvest-muted',String(muted));if(muted)for(const clip of effects.values())clip.pause();label();sync()};
export function battleMusic(on){
 const next=on?'harvest':'board';if(next===mode)return;
 clearTimeout(restoreVolume);harvestLevel=.29;mix();tracks[mode].pause();mode=next;if(on)tracks.harvest.currentTime=0;sync()
}
export function playCue(name){
 if(muted||document.hidden)return;
 if(!effects.has(name))effects.set(name,new Audio('/audio/'+name+'.mp3'));
 if(combatCues.has(name)){
   clearTimeout(restoreVolume);harvestLevel=.11;mix();
   restoreVolume=setTimeout(()=>{harvestLevel=.29;mix()},1150)
 }
 const clip=effects.get(name);clip.volume=effectLevel(name)*master;clip.currentTime=0;clip.play().catch(()=>{})
}
for(const event of ['pointerdown','keydown','visibilitychange'])document.addEventListener(event,sync);
document.addEventListener('click',e=>{if(e.target.closest('button')&&e.target!==control)playCue('tap')});
sync();
