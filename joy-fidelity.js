import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
async function main(){
  const code=new URLSearchParams(location.search).get('code');
  if(!code) return;
  const {data,error}=await supabase.rpc('get_public_invitation',{p_code:code});
  const i=Array.isArray(data)?data[0]:data;
  if(error||!i) return;
  const urls=[i.gallery_image_1_url,i.gallery_image_2_url,i.gallery_image_3_url,i.gallery_image_4_url,i.hero_image_url].filter(Boolean);
  const pages=[...document.querySelectorAll('.page')];
  const slots=[
    document.querySelector('#rsvp .rsvp-page-photo'),
    document.querySelector('#agenda .page-photo-panel'),
    document.querySelector('#regalos .page-photo-panel'),
    document.querySelector('#viaje .page-photo-panel'),
    document.querySelector('#faq .page-photo-panel')
  ];
  slots.forEach((slot,idx)=>{
    if(!slot||!urls.length)return;
    const u=urls[idx%urls.length];
    slot.style.setProperty('--page-photo',`url("${String(u).replace(/"/g,'%22')}")`);
    slot.closest('.page')?.classList.add('has-page-photo');
  });
  let pill=document.querySelector('.reference-access-pill');
  if(!pill){
    pill=document.createElement('div');pill.className='reference-access-pill';
    pill.innerHTML='<span><strong id="pill-date"></strong></span><button type="button" id="pill-pass">Abrir pase</button>';
    document.body.appendChild(pill);
    $('#pill-pass').addEventListener('click',()=>{
      const b=$('#view-pass-2')||$('#view-pass');
      if(b) b.click(); else document.querySelector('.access')?.scrollIntoView({behavior:'smooth'});
    });
  }
  $('#pill-date').textContent=i.event_date||'';
  const lang=i.language==='en';
  if(lang){
    $('#pill-date')?.setAttribute('aria-label','Event date');
    $('#pill-pass').textContent='Open pass';
  }
}
main();
