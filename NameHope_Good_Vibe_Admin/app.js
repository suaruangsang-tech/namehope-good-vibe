/* NameHope Good Vibe — music player + secure Supabase Admin */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const KEY = 'nh_playlist_v1';
const parse = u => {
  let m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:\S*&)?v=|shorts\/|embed\/))([\w-]{11})/);
  if (m) return { k:'yt', id:m[1] };
  m = String(u || '').match(/suno\.com\/song\/([0-9a-f-]{36})/i);
  if (m) return { k:'au', src:'https://cdn1.suno.ai/'+m[1]+'.mp3' };
  if (/^\S+\.(mp3|m4a|wav|ogg)(\?\S*)?$/i.test(String(u || ''))) return { k:'au', src:u };
  return null;
};
const valid = a => Array.isArray(a) ? a.filter(x => x && x.t && x.u && parse(x.u)) : [];
let pub = valid(window.PLAYLIST || []);
let list = pub.slice(), queue=[], hist=[], cur=-1, yt=null, ytReady=false, ytLoading=false, pendingId=null, errs=0;
let sb=null, session=null, cloudEnabled=false, isAdmin=false, cloudRows=[];
const adminEmail=(window.NAMEHOPE_SUPABASE?.adminEmail||'').toLowerCase();
const au = new Audio(); au.preload='none';
const stage=$('#stage'), now=$('#now'), pl=$('#pl'), card=$('#player');
const adm=$('#admin'), login=$('#adminLogin');
const setPlaying = b => { document.body.classList.toggle('playing',b); $('#pp').setAttribute('aria-label',b?'หยุดชั่วคราว':'เล่น'); };
const isYT = () => cur>=0 && list[cur] && parse(list[cur].u).k==='yt';

function initSupabase(){
  const cfg=window.NAMEHOPE_SUPABASE || {};
  if(!cfg.url || !cfg.anonKey || cfg.url.includes('YOUR_') || cfg.anonKey.includes('YOUR_')) return;
  if(!window.supabase?.createClient) return;
  sb=window.supabase.createClient(cfg.url,cfg.anonKey);
  cloudEnabled=true;
  sb.auth.getSession().then(({data})=>{session=data.session;syncAdmin();});
  sb.auth.onAuthStateChange((_event,newSession)=>{session=newSession;syncAdmin();});
}
async function loadCloudPlaylist(){
  if(!cloudEnabled) return;
  const {data,error}=await sb.from('songs').select('id,title,audio_path,cover_path,sort_order,published').eq('published',true).order('sort_order',{ascending:true});
  if(error){console.warn('NameHope playlist:',error.message);return;}
  cloudRows=data||[];
  pub=cloudRows.map(row=>({id:row.id,t:row.title,u:publicUrl(row.audio_path),cover:row.cover_path?publicUrl(row.cover_path):null, audio_path:row.audio_path, cover_path:row.cover_path}));
  list=pub.slice(); queue=[];hist=[];cur=-1;
  now.textContent=list.length?'กดเล่นเพื่อสุ่มเพลง':'ยังไม่มีเพลงใน Playlist';
  render(); renderAdminSongs();
}
function publicUrl(path){
  const {data}=sb.storage.from('music').getPublicUrl(path);
  return data.publicUrl;
}
function initYT(){
  if(ytLoading)return; ytLoading=true;
  window.onYouTubeIframeAPIReady=()=>{yt=new YT.Player('yt',{width:'100%',height:'100%',playerVars:{playsinline:1,rel:0},events:{
    onReady:()=>{ytReady=true;if(pendingId){yt.loadVideoById(pendingId);pendingId=null}},
    onStateChange:e=>{if(!isYT())return;const st=e.data;if(st===0)next();else if(st===1){errs=0;setPlaying(true)}else if(st===2)setPlaying(false)},
    onError:()=>{if(isYT())onErr()}
  }});};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);
}
function onErr(){
  errs++; if(errs<=list.length){now.textContent='เล่นเพลงนี้ไม่ได้ กำลังข้ามไปเพลงถัดไป…';setTimeout(next,700)}
  else{errs=0;setPlaying(false);now.textContent='เล่นเพลงไม่ได้ในตอนนี้ ลองใหม่อีกครั้งภายหลัง'}
}
function play(i){
  const song=list[i]; if(!song)return;
  const p=parse(song.u);cur=i;now.textContent=song.t;stage.querySelector('.cv img').src=song.cover||$('.logo').src;render();
  if(p.k==='yt'){
    au.pause();stage.classList.remove('au');initYT();
    if(ytReady)yt.loadVideoById(p.id);else pendingId=p.id;
  }else{
    pendingId=null;if(ytReady)yt.pauseVideo();stage.classList.add('au');
    au.src=p.src;au.play().catch(e=>{if(e.name!=='AbortError')onErr()});
  }
}
function refill(){
  queue=list.map((_,i)=>i).filter(i=>i!==cur);
  for(let i=queue.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[queue[i],queue[j]]=[queue[j],queue[i]]}
}
function next(){
  if(!list.length)return;
  if(!queue.length)refill();if(!queue.length)queue=[0];
  if(cur>=0){hist.push(cur);if(hist.length>50)hist.shift()}
  play(queue.pop());
}
function prev(){
  if(hist.length)play(hist.pop());
  else if(cur>=0){if(isYT()){if(ytReady)yt.seekTo(0)}else au.currentTime=0}
}
function toggle(){
  if(cur<0){next();return}
  if(isYT()){if(ytReady)yt.getPlayerState()===1?yt.pauseVideo():yt.playVideo()}
  else au.paused?au.play():au.pause();
}
au.addEventListener('playing',()=>{if(!isYT()){errs=0;setPlaying(true)}});
au.addEventListener('pause',()=>{if(!isYT())setPlaying(false)});
au.addEventListener('ended',()=>{if(!isYT())next()});
au.addEventListener('error',()=>{if(!isYT()&&au.getAttribute('src'))onErr()});
function stopAll(){au.pause();if(ytReady)yt.stopVideo();setPlaying(false);}
function render(){
  pl.textContent='';
  list.forEach((song,i)=>{
    const li=document.createElement('li');if(i===cur)li.className='on';
    const b=document.createElement('button');b.className='row';b.textContent=song.t;
    if(i===cur)b.setAttribute('aria-current','true');
    b.onclick=()=>{if(cur>=0)hist.push(cur);play(i)};li.append(b);
    pl.append(li);
  });
  card.classList.toggle('empty',!list.length);
  $('#empty').hidden=!!list.length;
  $('#cnt').textContent=list.length+' เพลง';
}
function setMessage(el,msg,isError=false){el.textContent=msg;el.style.color=isError?'#c0392b':'';}
function syncAdmin(){
  const route=location.hash==='#admin';
  isAdmin=!!(route && session && cloudEnabled && adminEmail && (session.user?.email||'').toLowerCase()===adminEmail);
  login.hidden=!route || isAdmin;
  adm.hidden=!isAdmin;
  if(route && !cloudEnabled) setMessage($('#loginMsg'),'ยังไม่ได้ตั้งค่า Supabase — โปรดกรอก URL, anon key และอีเมล Admin ใน supabase-config.js',true);
  else if(route && session && !isAdmin) setMessage($('#loginMsg'),'บัญชีนี้ไม่มีสิทธิ์ Admin ของ NameHope',true);
  renderAdminSongs();
}
function renderAdminSongs(){
  const ul=$('#adminSongs');if(!ul)return;ul.textContent='';
  if(!isAdmin)return;
  cloudRows.forEach((row,index)=>{
    const li=document.createElement('li');
    const name=document.createElement('span');name.className='song-name';name.textContent=row.title;li.append(name);
    const edit=document.createElement('button');edit.className='btn';edit.textContent='แก้ชื่อ';edit.onclick=()=>editSong(row);li.append(edit);
    const up=document.createElement('button');up.className='btn';up.textContent='↑';up.disabled=index===0;up.setAttribute('aria-label','เลื่อนขึ้น');up.onclick=()=>moveSong(index,-1);li.append(up);
    const down=document.createElement('button');down.className='btn';down.textContent='↓';down.disabled=index===cloudRows.length-1;down.setAttribute('aria-label','เลื่อนลง');down.onclick=()=>moveSong(index,1);li.append(down);
    const del=document.createElement('button');del.className='btn';del.textContent='ลบ';del.onclick=()=>deleteSong(row);li.append(del);
    ul.append(li);
  });
}
async function uploadAsset(file,folder){
  const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=folder+'/'+crypto.randomUUID()+'.'+ext;
  const {error}=await sb.storage.from('music').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
  if(error)throw error;return path;
}
$('#loginBtn').addEventListener('click',async()=>{
  const email=$('#adminEmail').value.trim(),password=$('#adminPassword').value;
  if(!cloudEnabled){setMessage($('#loginMsg'),'ยังไม่ได้ตั้งค่า Supabase กรุณาทำตามคู่มือก่อน',true);return;}
  if(!email||!password){setMessage($('#loginMsg'),'กรุณากรอกอีเมลและรหัสผ่าน',true);return;}
  const btn=$('#loginBtn');btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ…';
  const {error}=await sb.auth.signInWithPassword({email,password});
  btn.disabled=false;btn.textContent='เข้าสู่ระบบ';
  setMessage($('#loginMsg'),error?error.message:'เข้าสู่ระบบสำเร็จ',!!error);
});
$('#logoutBtn').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();location.hash='';});
$('#songForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!isAdmin)return;
  const title=$('#songTitle').value.trim(),audio=$('#audioFile').files[0],cover=$('#coverFile').files[0],btn=$('#uploadBtn'),msg=$('#adminMsg');
  if(!title||!audio){setMessage(msg,'กรุณากรอกชื่อเพลงและเลือกไฟล์เสียง',true);return;}
  if(audio.size>100*1024*1024){setMessage(msg,'ไฟล์เพลงมีขนาดเกิน 100 MB',true);return;}
  btn.disabled=true;btn.textContent='กำลังอัปโหลด…';
  let audioPath=null,coverPath=null;
  try{
    audioPath=await uploadAsset(audio,'audio');
    if(cover)coverPath=await uploadAsset(cover,'covers');
    const sort=cloudRows.length?Math.max(...cloudRows.map(x=>x.sort_order||0))+1:1;
    const {error}=await sb.from('songs').insert({title,audio_path:audioPath,cover_path:coverPath,sort_order:sort,published:true});
    if(error)throw error;
    $('#songForm').reset();await loadCloudPlaylist();setMessage(msg,'เผยแพร่สำเร็จ — เพลงปรากฏบนหน้าเว็บไซต์แล้ว');
  }catch(err){
    setMessage(msg,'อัปโหลดไม่สำเร็จ: '+(err.message||'เกิดข้อผิดพลาด'),true);
    const paths=[audioPath,coverPath].filter(Boolean);if(paths.length)await sb.storage.from('music').remove(paths);
  }finally{btn.disabled=false;btn.textContent='อัปโหลดและเผยแพร่เพลง';}
});
async function editSong(row){
  const title=prompt('แก้ไขชื่อเพลง',row.title);if(title===null||!title.trim())return;
  const {error}=await sb.from('songs').update({title:title.trim()}).eq('id',row.id);
  if(error){setMessage($('#adminMsg'),'แก้ไขไม่สำเร็จ: '+error.message,true);return;}
  await loadCloudPlaylist();setMessage($('#adminMsg'),'บันทึกชื่อเพลงแล้ว');
}
async function deleteSong(row){
  if(!confirm('ต้องการลบเพลง "'+row.title+'" ออกจากเว็บไซต์ใช่หรือไม่?'))return;
  const {error}=await sb.from('songs').delete().eq('id',row.id);
  if(error){setMessage($('#adminMsg'),'ลบไม่สำเร็จ: '+error.message,true);return;}
  const paths=[row.audio_path,row.cover_path].filter(Boolean);
  if(paths.length)await sb.storage.from('music').remove(paths);
  await loadCloudPlaylist();setMessage($('#adminMsg'),'ลบเพลงเรียบร้อยแล้ว');
}
async function moveSong(index,delta){
  const reordered=cloudRows.slice(),target=index+delta;
  [reordered[index],reordered[target]]=[reordered[target],reordered[index]];
  const updates=reordered.map((r,i)=>({id:r.id,sort_order:i+1}));
  for(const item of updates){
    const {error}=await sb.from('songs').update({sort_order:item.sort_order}).eq('id',item.id);
    if(error){setMessage($('#adminMsg'),'จัดลำดับไม่สำเร็จ: '+error.message,true);return;}
  }
  await loadCloudPlaylist();setMessage($('#adminMsg'),'บันทึกลำดับ Playlist แล้ว');
}
$('#pp').onclick=toggle;$('#nx').onclick=next;$('#prev').onclick=prev;
addEventListener('hashchange',syncAdmin);
stage.querySelector('.cv img').src=$('.logo').src;
initSupabase();
syncAdmin();
if(cloudEnabled)loadCloudPlaylist();
if(list.some(song=>parse(song.u).k==='yt'))initYT();
})();