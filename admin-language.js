import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const button=document.querySelector('#create-invitation');
const formMessage=document.querySelector('#form-message');
const createdBox=document.querySelector('#created-box');

function addLanguageField(){
  if(document.querySelector('#guest-language') || !button) return;
  const field=document.createElement('div');
  field.className='field';
  field.innerHTML='<label for="guest-language">Idioma de la invitación</label><select id="guest-language"><option value="es">🇪🇸 Español</option><option value="en">🇺🇸 English</option></select>';
  const grid=button.closest('.form-grid');
  if(grid) grid.insertBefore(field,button.parentElement);
}

async function createWithLanguage(event){
  event.preventDefault();
  event.stopImmediatePropagation();
  const { data:{ user } }=await supabase.auth.getUser();
  if(!user){formMessage.textContent='Inicia sesión para crear invitaciones.';return;}
  const { data:isAdmin, error:adminError }=await supabase.rpc('is_admin');
  if(adminError || !isAdmin){formMessage.textContent='Esta cuenta no tiene permisos de administrador.';return;}
  const name=document.querySelector('#guest-name')?.value.trim();
  const total=Number(document.querySelector('#guest-total')?.value);
  const allowChildren=document.querySelector('#allow-children')?.checked||false;
  const language=document.querySelector('#guest-language')?.value||'es';
  if(!name||!Number.isInteger(total)||total<1||total>100){formMessage.textContent='Completa nombre y cupos correctamente.';return;}
  formMessage.textContent='Generando invitación…';
  button.disabled=true;
  const {data,error}=await supabase.rpc('create_invitation',{p_name:name,p_total_guests:total,p_allow_children:allowChildren,p_language:language});
  const invitation=Array.isArray(data)?data[0]:data;
  if(error||!invitation){formMessage.textContent=error?.message||'No se pudo crear la invitación.';button.disabled=false;return;}
  const url=`${location.origin}${location.pathname.replace(/\/admin\.html$/,'/')}invitacion.html?code=${encodeURIComponent(invitation.code)}`;
  formMessage.textContent='Invitación creada correctamente.';
  createdBox.classList.remove('hidden');
  createdBox.innerHTML=`<strong>${name}</strong><div style="margin-top:8px"><span class="created-code">${invitation.code}</span><span style="margin-left:8px" class="pill">${language==='en'?'🇺🇸 English':'🇪🇸 Español'}</span></div><p class="notice">El idioma quedó guardado en esta invitación. El mismo código conecta RSVP, QR y acceso.</p><div class="created-actions"><button id="copy-created-language" class="small-btn secondary" type="button">Copiar enlace</button><a class="small-btn secondary" target="_blank" rel="noopener" href="${url}">Ver invitación</a><a class="small-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Hola ${name} 💕 Aquí tienes tu invitación: ${url}`)}">WhatsApp</a></div>`;
  document.querySelector('#copy-created-language').addEventListener('click',async()=>{await navigator.clipboard.writeText(url);document.querySelector('#copy-created-language').textContent='Enlace copiado';});
  document.querySelector('#guest-name').value='';document.querySelector('#guest-total').value='2';document.querySelector('#allow-children').checked=false;document.querySelector('#guest-language').value='es';
  button.disabled=false;
  setTimeout(()=>location.reload(),500);
}

addLanguageField();
if(button) button.addEventListener('click',createWithLanguage,true);
