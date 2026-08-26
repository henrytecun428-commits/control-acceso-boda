import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const loading = document.querySelector('#loading');
const site = document.querySelector('#invite');
const code = new URLSearchParams(location.search).get('code');
const $ = (s) => document.querySelector(s);
const setText = (s, v) => { const e=$(s); if(e) e.textContent=v ?? ''; };
const escapeUrl = (u) => String(u || '').replace(/"/g, '%22');

function revealSite(){loading.classList.add('hidden');site.classList.remove('hidden');requestAnimationFrame(()=>document.querySelectorAll('.reveal').forEach(e=>observer.observe(e)))}
function setLink(s,u){const e=$(s);if(!e)return;if(u){e.href=u;e.classList.remove('hidden')}else e.classList.add('hidden')}

let qrReady;
function ensureQr(){
  if(window.QRCode) return Promise.resolve();
  if(qrReady) return qrReady;
  qrReady=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
    script.onload=()=>resolve(); script.onerror=reject; document.head.appendChild(script);
  });
  return qrReady;
}
async function renderQr(selector,value,size=164){
  const target=$(selector); if(!target)return;
  try{await ensureQr(); target.innerHTML=''; const canvas=document.createElement('canvas'); target.appendChild(canvas); await new Promise((resolve,reject)=>window.QRCode.toCanvas(canvas,value,{width:size,margin:1,color:{dark:'#26322d',light:'#ffffff'}},(err)=>err?reject(err):resolve()));}
  catch{target.innerHTML='<span class="tiny">QR no disponible</span>'}
}

function setupCountdown(raw){const box=$('#countdown');if(!box||!raw)return;const d=new Date(raw);if(Number.isNaN(d.getTime()))return;box.hidden=false;const tick=()=>{const r=d.getTime()-Date.now();if(r<=0){['#days','#hours','#minutes','#seconds'].forEach(s=>setText(s,'0'));return}const sec=Math.floor(r/1000);setText('#days',Math.floor(sec/86400));setText('#hours',Math.floor(sec%86400/3600));setText('#minutes',Math.floor(sec%3600/60));setText('#seconds',sec%60)};tick();setInterval(tick,1000)}

function setupGallery(images){
  const cards=[...document.querySelectorAll('.gallery-card')],lightbox=$('#lightbox'),art=$('#lightbox-art'),caption=$('#lightbox-caption'),close=$('#lightbox-close');
  const captions=['Un momento para recordar','Juntos','Nuestro día','Siempre'];
  cards.forEach((card,i)=>{
    const u=images[i];
    if(u){card.style.backgroundImage=`linear-gradient(180deg,rgba(20,24,22,.02),rgba(20,24,22,.30)),url("${escapeUrl(u)}")`;card.classList.add('has-photo');card.querySelector('span')?.classList.add('hidden')}
    else card.classList.add('gallery-empty');
    card.addEventListener('click',()=>{if(!u)return;art.style.backgroundImage=`url("${escapeUrl(u)}")`;caption.textContent=captions[i]||'Un momento especial';lightbox.classList.remove('hidden');document.body.style.overflow='hidden'});
  });
  const shut=()=>{lightbox.classList.add('hidden');document.body.style.overflow=''};
  close?.addEventListener('click',shut);lightbox?.addEventListener('click',e=>{if(e.target===lightbox)shut()});document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
}

function celebrate(){const b=document.createElement('div');b.className='celebration';for(let i=0;i<18;i++){const p=document.createElement('span');p.textContent=i%2?'✦':'·';p.style.setProperty('--x',`${(Math.random()-.5)*280}px`);p.style.setProperty('--y',`${-80-Math.random()*180}px`);p.style.setProperty('--r',`${(Math.random()-.5)*240}deg`);b.appendChild(p)}document.body.appendChild(b);setTimeout(()=>b.remove(),1100)}

function openPass(name,count,inviteCode){
  setText('#pass-name',name); setText('#pass-people',`${count} ${count===1?'persona':'personas'} confirmada${count===1?'':'s'}`); setText('#pass-code',inviteCode); setText('#code',inviteCode);
  const accessUrl=`${location.origin}${location.pathname.replace(/invitacion\.html$/, '')}index.html?code=${encodeURIComponent(inviteCode)}`;
  renderQr('#pass-qr',accessUrl,188);
  $('#pass-modal')?.classList.remove('hidden'); document.body.style.overflow='hidden';
}
function closePass(){ $('#pass-modal')?.classList.add('hidden'); document.body.style.overflow=''; }

async function updateRsvp(msg,count,status){msg.textContent='Guardando…';const{data,error}=await supabase.rpc('update_rsvp',{p_code:code,p_confirmed_guests:count,p_status:status});const r=Array.isArray(data)?data[0]:data;if(error||!r?.success){msg.textContent=r?.message||error?.message||'No se pudo guardar la respuesta.';return null}msg.textContent=status==='confirmed'?`¡Perfecto! Confirmaste ${r.confirmed_guests} ${r.confirmed_guests===1?'persona':'personas'}.`:'Hemos registrado que no podrás acompañarnos.';return r}

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}}),{threshold:.12});

async function init(){
  if(!code){loading.textContent='Esta invitación necesita un código.';return}
  const{data,error}=await supabase.rpc('get_public_invitation',{p_code:code});const i=Array.isArray(data)?data[0]:data;
  if(error||!i){loading.textContent='Esta invitación no está disponible.';return}

  setText('#guest-name',i.guest_name);setText('#rsvp-guest',i.guest_name);setText('#couple-names',i.couple_names);setText('#footer-couple',i.couple_names);setText('#hero-date',i.event_date);setText('#welcome-text',i.welcome_text);setText('#reception-time',i.reception_time);setText('#ceremony-time',i.ceremony_time);setText('#venue-name',i.venue_name);setText('#venue-address',i.venue_address);setText('#parking-text',i.parking_text);setText('#faq-parking',i.parking_text);setText('#dress-code',i.dress_code);setText('#dress-code-alt',i.dress_code);setText('#gift-text',i.gift_text);setText('#total-guests',i.total_guests);setText('#code',i.code);setText('#faq-children',i.allow_children?'Sí. Esta invitación permite niños.':'Esta invitación está configurada sin niños.');
  setLink('#maps-link',i.maps_url);setLink('#waze-link',i.waze_url);setLink('#gift-link',i.gift_url);
  if(i.hero_image_url) $('.hero').style.backgroundImage=`url("${escapeUrl(i.hero_image_url)}")`;
  setupCountdown(i.event_date);
  const accessUrl=`${location.origin}${location.pathname.replace(/invitacion\.html$/, '')}index.html?code=${encodeURIComponent(i.code)}`;
  renderQr('#qr',accessUrl,164);
  setupGallery([i.gallery_image_1_url,i.gallery_image_2_url,i.gallery_image_3_url,i.gallery_image_4_url]);

  let count=Math.max(1,Math.min(Number(i.confirmed_guests||1),Number(i.total_guests)));
  setText('#count',count);
  if(i.rsvp_status==='confirmed' && Number(i.confirmed_guests)>0){$('#confirmed-badge')?.classList.remove('hidden');$('#view-pass')?.classList.remove('hidden')}

  const minus=$('#minus'),plus=$('#plus'),confirm=$('#confirm'),decline=$('#decline'),msg=$('#rsvp-message');
  const sync=()=>{setText('#count',count);minus.disabled=count<=1;plus.disabled=count>=i.total_guests};
  minus.addEventListener('click',()=>{count=Math.max(1,count-1);sync()});plus.addEventListener('click',()=>{count=Math.min(Number(i.total_guests),count+1);sync()});
  confirm.addEventListener('click',async()=>{confirm.disabled=true;decline.disabled=true;const r=await updateRsvp(msg,count,'confirmed');if(r){$('#confirmed-badge')?.classList.remove('hidden');$('#view-pass')?.classList.remove('hidden');celebrate();setTimeout(()=>openPass(i.guest_name,Number(r.confirmed_guests),i.code),280)}confirm.disabled=false;decline.disabled=false});
  decline.addEventListener('click',async()=>{if(!window.confirm('¿Seguro que deseas indicar que no podrás asistir?'))return;confirm.disabled=true;decline.disabled=true;await updateRsvp(msg,0,'declined');$('#confirmed-badge')?.classList.add('hidden');$('#view-pass')?.classList.add('hidden');confirm.disabled=false;decline.disabled=false});
  $('#view-pass')?.addEventListener('click',()=>openPass(i.guest_name,count,i.code));
  $('#pass-close')?.addEventListener('click',closePass); $('#pass-close-2')?.addEventListener('click',closePass); $('#pass-modal')?.addEventListener('click',e=>{if(e.target.id==='pass-modal')closePass()}); document.addEventListener('keydown',e=>{if(e.key==='Escape')closePass()});
  sync();revealSite();
}
init();
