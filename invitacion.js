import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const loading = document.querySelector('#loading');
const site = document.querySelector('#invite');
const code = new URLSearchParams(location.search).get('code');
const $ = (s) => document.querySelector(s);
const setText = (s, v) => { const e=$(s); if(e) e.textContent=v ?? ''; };
const escapeUrl = (u) => String(u || '').replace(/"/g, '%22');
let currentInvitation = null;

function revealSite(){
  loading.classList.add('hidden');
  site.classList.remove('hidden');
  requestAnimationFrame(()=>document.querySelectorAll('.reveal').forEach(e=>observer.observe(e)));
  setupPageExperience();
}
function setLink(s,u){const e=$(s);if(!e)return;if(u){e.href=u;e.classList.remove('hidden')}else e.classList.add('hidden')}

let qrReady;
function ensureQr(){
  if(window.QRCode) return Promise.resolve();
  if(qrReady) return qrReady;
  qrReady=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';script.onload=()=>resolve();script.onerror=reject;document.head.appendChild(script)});
  return qrReady;
}
async function renderQr(selector,value,size=164){
  const target=$(selector); if(!target)return;
  try{await ensureQr();target.innerHTML='';const canvas=document.createElement('canvas');target.appendChild(canvas);await new Promise((resolve,reject)=>window.QRCode.toCanvas(canvas,value,{width:size,margin:1,color:{dark:'#26322d',light:'#ffffff'}},err=>err?reject(err):resolve()))}
  catch{target.innerHTML='<span class="tiny">QR no disponible</span>'}
}

function setupCountdown(raw){
  const box=$('#countdown');if(!box||!raw)return;const d=new Date(raw);if(Number.isNaN(d.getTime()))return;box.hidden=false;
  const tick=()=>{const r=d.getTime()-Date.now();if(r<=0){['#days','#hours','#minutes','#seconds'].forEach(s=>setText(s,'0'));return}const sec=Math.floor(r/1000);setText('#days',Math.floor(sec/86400));setText('#hours',Math.floor(sec%86400/3600));setText('#minutes',Math.floor(sec%3600/60));setText('#seconds',sec%60)};tick();setInterval(tick,1000)
}

function setupGallery(images){
  const cards=[...document.querySelectorAll('.gallery-card')],lightbox=$('#lightbox'),art=$('#lightbox-art'),caption=$('#lightbox-caption'),close=$('#lightbox-close');
  const captions=['Un momento para recordar','Juntos','Nuestro día','Siempre'];
  cards.forEach((card,i)=>{const u=images[i];if(u){card.style.backgroundImage=`linear-gradient(180deg,rgba(20,24,22,.02),rgba(20,24,22,.30)),url("${escapeUrl(u)}")`;card.classList.add('has-photo');card.querySelector('span')?.classList.add('hidden')}else card.classList.add('gallery-empty');card.addEventListener('click',()=>{if(!u)return;art.style.backgroundImage=`url("${escapeUrl(u)}")`;caption.textContent=captions[i]||'Un momento especial';lightbox.classList.remove('hidden');document.body.style.overflow='hidden'})});
  const shut=()=>{lightbox.classList.add('hidden');document.body.style.overflow=''};close?.addEventListener('click',shut);lightbox?.addEventListener('click',e=>{if(e.target===lightbox)shut()});document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()})
}

function celebrate(){const b=document.createElement('div');b.className='celebration';for(let i=0;i<18;i++){const p=document.createElement('span');p.textContent=i%2?'✦':'·';p.style.setProperty('--x',`${(Math.random()-.5)*280}px`);p.style.setProperty('--y',`${-80-Math.random()*180}px`);p.style.setProperty('--r',`${(Math.random()-.5)*240}deg`);b.appendChild(p)}document.body.appendChild(b);setTimeout(()=>b.remove(),1100)}

function openPass(name,count,inviteCode){
  setText('#pass-name',name);setText('#pass-people',`${count} ${count===1?'persona':'personas'} confirmada${count===1?'':'s'}`);setText('#pass-code',inviteCode);setText('#code',inviteCode);
  const accessUrl=`${location.origin}${location.pathname.replace(/invitacion\.html$/, '')}index.html?code=${encodeURIComponent(inviteCode)}`;renderQr('#pass-qr',accessUrl,188);$('#pass-modal')?.classList.remove('hidden');document.body.style.overflow='hidden';
}
function closePass(){$('#pass-modal')?.classList.add('hidden');document.body.style.overflow=''}

function setupPageExperience(){
  const pages=[...site.querySelectorAll('.page')];
  const dots=$('#page-dots');if(!pages.length)return;
  dots.innerHTML=pages.map((p,i)=>`<button class="page-dot" type="button" data-dot="${i}" aria-label="Ir a ${p.dataset.pageLabel||`página ${i+1}`}"></button>`).join('');
  const go=(index)=>{const safe=Math.max(0,Math.min(pages.length-1,index));pages[safe].scrollIntoView({behavior:'smooth',block:'start'});};
  document.querySelectorAll('[data-next-page]').forEach((b)=>b.addEventListener('click',()=>{const page=b.closest('.page');go(Math.min(pages.length-1,pages.indexOf(page)+1))}));
  document.querySelectorAll('[data-go-page]').forEach((b)=>b.addEventListener('click',()=>go(Number(b.dataset.goPage))));
  dots.querySelectorAll('[data-dot]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.dot))));
  const update=(idx)=>{dots.querySelectorAll('.page-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));document.querySelectorAll('[data-go-page]').forEach(b=>b.classList.toggle('active',Number(b.dataset.goPage)===idx));const bar=$('#progress-bar');if(bar)bar.style.width=`${(idx/(pages.length-1||1))*100}%`};
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){const idx=pages.indexOf(e.target);if(idx>=0)update(idx)}}),{root:site,threshold:.65});pages.forEach(p=>io.observe(p));
  let lock=false;site.addEventListener('wheel',(e)=>{if(lock||document.querySelector('.pass-modal:not(.hidden),.lightbox:not(.hidden)'))return;if(Math.abs(e.deltaY)<18)return;const interactive=e.target.closest('button,a,input,textarea,select,label,details,.floating-nav');if(interactive&&e.deltaY!==0)return;const current=Math.round(site.scrollTop/site.clientHeight);const next=e.deltaY>0?current+1:current-1;if(next<0||next>=pages.length)return;e.preventDefault();lock=true;go(next);setTimeout(()=>lock=false,650)},{passive:false});
  let touchStartY=null;site.addEventListener('touchstart',e=>{touchStartY=e.touches[0].clientY},{passive:true});site.addEventListener('touchend',e=>{if(touchStartY===null)return;const dy=touchStartY-e.changedTouches[0].clientY;if(Math.abs(dy)<45){touchStartY=null;return}const current=Math.round(site.scrollTop/site.clientHeight);const next=dy>0?current+1:current-1;if(next>=0&&next<pages.length)go(next);touchStartY=null},{passive:true});
}

async function updateRsvp(msg,count,status){msg.textContent='Guardando…';const{data,error}=await supabase.rpc('update_rsvp',{p_code:code,p_confirmed_guests:count,p_status:status});const r=Array.isArray(data)?data[0]:data;if(error||!r?.success){msg.textContent=r?.message||error?.message||'No se pudo guardar la respuesta.';return null}msg.textContent=status==='confirmed'?`Perfecto. Quedan ${Math.max(Number(r.total_guests)-Number(r.confirmed_guests),0)} lugares disponibles.`:'Hemos guardado tu respuesta. Gracias por avisarnos.';return r}

async function compressImage(file){
  if(file.size>5*1024*1024)throw new Error('Cada foto debe pesar menos de 5 MB.');
  const url=URL.createObjectURL(file);try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('No pudimos leer una de las fotos.'));i.src=url});const max=1800;const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la foto.')),'image/webp',.82))}finally{URL.revokeObjectURL(url)}}
function setupGuestUpload(inviteCode){
  const input=$('#guest-photos'),preview=$('#guest-preview'),button=$('#upload-guest-photos'),msg=$('#guest-upload-message');if(!input||!preview||!button)return;let selected=[];let uploaded=false;
  input.addEventListener('change',()=>{const files=[...input.files||[]].slice(0,2);selected=files;preview.innerHTML=files.length?files.map((f,i)=>`<div class="preview-item"><img src="${URL.createObjectURL(f)}" alt="Foto ${i+1}"><span>Foto ${i+1}</span></div>`).join(''):' ';if((input.files||[]).length>2)msg.textContent='Puedes seleccionar máximo 2 fotos.';else msg.textContent=files.length?'':'Selecciona hasta 2 fotos.'});
  button.addEventListener('click',async()=>{if(uploaded){msg.textContent='Estas fotos ya fueron enviadas.';return}if(!selected.length){msg.textContent='Selecciona al menos una foto.';return}button.disabled=true;msg.textContent='Preparando tus fotos…';try{for(let idx=0;idx<selected.length;idx++){const blob=await compressImage(selected[idx]);const path=`guest-photos/${inviteCode}/${Date.now()}-${idx}-${crypto.randomUUID()}.webp`;const{error}=await supabase.storage.from('wedding-media').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});if(error)throw error}uploaded=true;selected=[];input.value='';preview.innerHTML='';msg.textContent='¡Listo! Gracias por compartir este recuerdo con nosotros. ✦';button.textContent='Fotos enviadas'}catch(error){msg.textContent=error?.message||'No pudimos subir las fotos. Inténtalo nuevamente.';button.disabled=false}})
}

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}}),{root:site,threshold:.12});

async function init(){
  if(!code){loading.textContent='Esta invitación necesita un código.';return}
  const{data,error}=await supabase.rpc('get_public_invitation',{p_code:code});const i=Array.isArray(data)?data[0]:data;if(error||!i){loading.textContent='Esta invitación no está disponible.';return}currentInvitation=i;
  setText('#guest-name',i.guest_name);setText('#rsvp-guest',i.guest_name);setText('#couple-names',i.couple_names);setText('#footer-couple',i.couple_names);setText('#hero-date',i.event_date);setText('#welcome-text',i.welcome_text);setText('#reception-time',i.reception_time);setText('#ceremony-time',i.ceremony_time);setText('#venue-name',i.venue_name);setText('#venue-address',i.venue_address);setText('#parking-text',i.parking_text);setText('#dress-code',i.dress_code);setText('#total-guests',i.total_guests);setText('#code',i.code);setText('#faq-parking',i.parking_text);setText('#faq-children',i.allow_children?'Sí. Esta invitación permite niños.':'Esta invitación está configurada sin niños.');
  setLink('#maps-link',i.maps_url);setLink('#waze-link',i.waze_url);
  if(i.hero_image_url) $('.hero').style.backgroundImage=`url("${escapeUrl(i.hero_image_url)}")`;
  setupCountdown(i.event_date);const accessUrl=`${location.origin}${location.pathname.replace(/invitacion\.html$/,'')}index.html?code=${encodeURIComponent(i.code)}`;renderQr('#qr',accessUrl,164);setupGallery([i.gallery_image_1_url,i.gallery_image_2_url,i.gallery_image_3_url,i.gallery_image_4_url]);setupGuestUpload(i.code);
  let count=Math.max(1,Math.min(Number(i.confirmed_guests||1),Number(i.total_guests)));setText('#count',count);
  const confirmed=i.rsvp_status==='confirmed'&&Number(i.confirmed_guests)>0;if(confirmed){$('#confirmed-badge')?.classList.remove('hidden');$('#view-pass')?.classList.remove('hidden')}
  const minus=$('#minus'),plus=$('#plus'),confirm=$('#confirm'),decline=$('#decline'),msg=$('#rsvp-message');const sync=()=>{setText('#count',count);minus.disabled=count<=1;plus.disabled=count>=Number(i.total_guests)};minus.addEventListener('click',()=>{count=Math.max(1,count-1);sync()});plus.addEventListener('click',()=>{count=Math.min(Number(i.total_guests),count+1);sync()});
  confirm.addEventListener('click',async()=>{confirm.disabled=true;decline.disabled=true;const r=await updateRsvp(msg,count,'confirmed');if(r){$('#confirmed-badge')?.classList.remove('hidden');$('#view-pass')?.classList.remove('hidden');celebrate();setTimeout(()=>openPass(i.guest_name,Number(r.confirmed_guests),i.code),300)}confirm.disabled=false;decline.disabled=false});
  decline.addEventListener('click',async()=>{if(!window.confirm('¿Seguro que deseas indicar que no podrás asistir?'))return;confirm.disabled=true;decline.disabled=true;await updateRsvp(msg,0,'declined');$('#confirmed-badge')?.classList.add('hidden');$('#view-pass')?.classList.add('hidden');confirm.disabled=false;decline.disabled=false});
  $('#view-pass')?.addEventListener('click',()=>openPass(i.guest_name,count,i.code));$('#view-pass-2')?.addEventListener('click',()=>openPass(i.guest_name,Math.max(1,Number(i.confirmed_guests||count)),i.code));
  $('#pass-close')?.addEventListener('click',closePass);$('#pass-close-2')?.addEventListener('click',closePass);$('#pass-modal')?.addEventListener('click',e=>{if(e.target.id==='pass-modal')closePass()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePass()});sync();revealSite()
}
init();