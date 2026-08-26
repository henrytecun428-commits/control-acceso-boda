import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const authPanel = document.querySelector('#auth-panel');
const adminPanel = document.querySelector('#admin-panel');
const logout = document.querySelector('#logout');
const authMessage = document.querySelector('#auth-message');
const formMessage = document.querySelector('#form-message');
const settingsMessage = document.querySelector('#settings-message');
const listMessage = document.querySelector('#list-message');
const body = document.querySelector('#invitations-body');
const createdBox = document.querySelector('#created-box');

const clean = (value) => String(value ?? '').replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;' }[c]));

async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

async function refreshSession() {
  const admin = await isAdmin();
  authPanel.classList.toggle('hidden', admin);
  adminPanel.classList.toggle('hidden', !admin);
  logout.classList.toggle('hidden', !admin);
  if (admin) await Promise.all([loadInvitations(), loadSettings()]);
}

function invitationUrl(code) {
  return `${window.location.origin}${window.location.pathname.replace(/\/admin\.html$/, '/') }invitacion.html?code=${encodeURIComponent(code)}`;
}

async function loadInvitations() {
  listMessage.textContent = 'Cargando...';
  const { data, error } = await supabase.from('invitations')
    .select('id,name,code,total_guests,confirmed_guests,rsvp_status,allow_children,active,access_entries(people_count)')
    .order('created_at', { ascending: false });
  if (error) { listMessage.textContent = error.message; body.innerHTML = ''; return; }

  let totalInvitations = data.length;
  let totalCupos = 0, totalConfirmados = 0, totalIngresaron = 0;
  body.innerHTML = data.map((inv) => {
    const used = (inv.access_entries || []).reduce((sum, entry) => sum + Number(entry.people_count || 0), 0);
    const available = Math.max(inv.total_guests - used, 0);
    totalCupos += Number(inv.total_guests || 0); totalConfirmados += Number(inv.confirmed_guests || 0); totalIngresaron += used;
    const url = invitationUrl(inv.code);
    const msg = encodeURIComponent(`Hola ${inv.name} 💕 Aquí tienes tu invitación: ${url}`);
    return `<tr><td><strong>${clean(inv.name)}</strong></td><td><span class="pill">${clean(inv.code)}</span></td><td>${inv.total_guests}</td><td>${inv.confirmed_guests || 0}</td><td>${used}</td><td>${available}</td><td>${clean(inv.rsvp_status)}</td><td><span class="status ${inv.active ? 'status-on' : 'status-off'}">${inv.active ? 'Activa' : 'Bloqueada'}</span></td><td><div class="actions"><button class="small-btn secondary" data-action="copy" data-url="${clean(url)}" type="button">Copiar enlace</button><a class="small-btn secondary" href="${url}" target="_blank" rel="noopener">Ver</a><a class="small-btn" href="https://wa.me/?text=${msg}" target="_blank" rel="noopener">WhatsApp</a><button class="small-btn secondary" data-action="toggle" data-id="${inv.id}" data-active="${inv.active}" type="button">${inv.active ? 'Bloquear' : 'Activar'}</button></div></td></tr>`;
  }).join('');
  document.querySelector('#summary-invitations').textContent = totalInvitations;
  document.querySelector('#summary-cupos').textContent = totalCupos;
  document.querySelector('#summary-confirmados').textContent = totalConfirmados;
  document.querySelector('#summary-ingresaron').textContent = totalIngresaron;
  body.querySelectorAll('[data-action="toggle"]').forEach((button) => button.addEventListener('click', () => toggleInvitation(button.dataset.id, button.dataset.active === 'true')));
  body.querySelectorAll('[data-action="copy"]').forEach((button) => button.addEventListener('click', async () => { await navigator.clipboard.writeText(button.dataset.url); button.textContent = 'Copiado'; setTimeout(() => button.textContent = 'Copiar enlace', 1400); }));
  listMessage.textContent = data.length ? `${data.length} invitación${data.length === 1 ? '' : 'es'} registradas.` : 'Todavía no hay invitaciones.';
}

async function loadSettings() {
  const { data, error } = await supabase.from('wedding_settings').select('*').eq('id', true).maybeSingle();
  if (error || !data) return;
  const fields = {
    'couple-names':'couple_names','welcome-text':'welcome_text','event-date':'event_date','reception-time':'reception_time','ceremony-time':'ceremony_time',
    'venue-name':'venue_name','venue-address':'venue_address','maps-url':'maps_url','waze-url':'waze_url','parking-text':'parking_text','dress-code':'dress_code',
    'gift-text':'gift_text','gift-url':'gift_url','hero-image-url':'hero_image_url','gallery-image-1':'gallery_image_1_url','gallery-image-2':'gallery_image_2_url','gallery-image-3':'gallery_image_3_url','gallery-image-4':'gallery_image_4_url'
  };
  Object.entries(fields).forEach(([id,key]) => { const el = document.querySelector(`#${id}`); if (el) el.value = data[key] ?? ''; });
}

async function toggleInvitation(id, active) {
  const action = active ? 'bloquear' : 'activar';
  if (!confirm(`¿Quieres ${action} esta invitación?`)) return;
  const { error } = await supabase.from('invitations').update({ active: !active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { listMessage.textContent = error.message; return; }
  await loadInvitations();
}

document.querySelector('#save-settings').addEventListener('click', async () => {
  settingsMessage.textContent = 'Guardando...';
  const payload = { id:true, couple_names:document.querySelector('#couple-names').value.trim(), welcome_text:document.querySelector('#welcome-text').value.trim(), event_date:document.querySelector('#event-date').value.trim(), reception_time:document.querySelector('#reception-time').value.trim(), ceremony_time:document.querySelector('#ceremony-time').value.trim(), venue_name:document.querySelector('#venue-name').value.trim(), venue_address:document.querySelector('#venue-address').value.trim(), maps_url:document.querySelector('#maps-url').value.trim(), waze_url:document.querySelector('#waze-url').value.trim(), parking_text:document.querySelector('#parking-text').value.trim(), dress_code:document.querySelector('#dress-code').value.trim(), gift_text:document.querySelector('#gift-text').value.trim(), gift_url:document.querySelector('#gift-url').value.trim(), hero_image_url:document.querySelector('#hero-image-url').value.trim(), gallery_image_1_url:document.querySelector('#gallery-image-1').value.trim(), gallery_image_2_url:document.querySelector('#gallery-image-2').value.trim(), gallery_image_3_url:document.querySelector('#gallery-image-3').value.trim(), gallery_image_4_url:document.querySelector('#gallery-image-4').value.trim(), updated_at:new Date().toISOString() };
  const { error } = await supabase.from('wedding_settings').upsert(payload);
  settingsMessage.textContent = error ? error.message : 'Datos guardados correctamente.';
});

document.querySelector('#login').addEventListener('click', async () => {
  authMessage.textContent='Entrando...'; const email=document.querySelector('#email').value.trim(); const password=document.querySelector('#password').value;
  if(!email||!password){authMessage.textContent='Escribe tu correo y contraseña.';return;}
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){authMessage.textContent=error.message;return;}
  if(!(await isAdmin())){await supabase.auth.signOut();authMessage.textContent='Esta cuenta no tiene permisos de administrador.';return;}
  await refreshSession();
});

document.querySelector('#signup').addEventListener('click', async () => { authMessage.textContent='Creando cuenta...'; const email=document.querySelector('#email').value.trim(); const password=document.querySelector('#password').value; if(!email||password.length<6){authMessage.textContent='Escribe un correo válido y una contraseña de al menos 6 caracteres.';return;} const {data,error}=await supabase.auth.signUp({email,password}); if(error){authMessage.textContent=error.message;return;} authMessage.textContent=data.session?'Cuenta creada.':'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'; });
logout.addEventListener('click', async()=>{await supabase.auth.signOut();await refreshSession();});

document.querySelector('#create-invitation').addEventListener('click', async()=>{
  formMessage.textContent='Generando invitación...'; createdBox.classList.add('hidden');
  const name=document.querySelector('#guest-name').value.trim(); const total=Number(document.querySelector('#guest-total').value); const allowChildren=document.querySelector('#allow-children').checked;
  if(!name||!Number.isInteger(total)||total<1||total>100){formMessage.textContent='Completa nombre y cupos correctamente.';return;}
  const {data,error}=await supabase.rpc('create_invitation',{p_name:name,p_total_guests:total,p_allow_children:allowChildren}); const invitation=Array.isArray(data)?data[0]:data;
  if(error||!invitation){formMessage.textContent=error?.message||'No se pudo crear la invitación.';return;}
  const url=invitationUrl(invitation.code); formMessage.textContent='Invitación creada correctamente.'; createdBox.classList.remove('hidden');
  createdBox.innerHTML=`<strong>${clean(invitation.name)}</strong><br><span class="created-code">${clean(invitation.code)}</span><p class="notice">El código es único y será el mismo para RSVP y acceso.</p><div class="created-actions"><button id="copy-created" class="small-btn secondary" type="button">Copiar enlace</button><a class="small-btn secondary" target="_blank" rel="noopener" href="${clean(url)}">Ver invitación</a><a class="small-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Hola ${invitation.name} 💕 Aquí tienes tu invitación: ${url}`)}">Enviar por WhatsApp</a></div>`;
  document.querySelector('#copy-created').addEventListener('click',async()=>{await navigator.clipboard.writeText(url);document.querySelector('#copy-created').textContent='Enlace copiado';});
  document.querySelector('#guest-name').value='';document.querySelector('#guest-total').value='2';document.querySelector('#allow-children').checked=false;await loadInvitations();
});
supabase.auth.onAuthStateChange(()=>refreshSession()); refreshSession();
