import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (s) => document.querySelector(s);
const authPanel = $('#auth-panel');
const adminPanel = $('#admin-panel');
const logout = $('#logout');
const authMessage = $('#auth-message');
const formMessage = $('#form-message');
const listMessage = $('#list-message');
const body = $('#invitations-body');
const createdBox = $('#created-box');

const clean = (v) => String(v ?? '').replace(/[&<>\'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

async function isAdmin(){
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

async function loadInvitations(){
  listMessage.textContent = 'Cargando…';
  const { data, error } = await supabase.rpc('admin_invitation_summary');
  if (error) { listMessage.textContent = error.message; return; }

  let totalCupos = 0, totalIngresaron = 0;
  body.innerHTML = (data || []).map((inv) => {
    totalCupos += Number(inv.total_guests || 0);
    totalIngresaron += Number(inv.used_guests || 0);
    const available = Number(inv.available_guests ?? (Number(inv.total_guests || 0) - Number(inv.used_guests || 0)));
    return `<tr>
      <td><strong>${clean(inv.name)}</strong></td>
      <td><span class="pill">${clean(inv.code)}</span></td>
      <td>${inv.total_guests}</td>
      <td>${inv.used_guests || 0}</td>
      <td>${available}</td>
      <td><span class="status ${inv.active ? 'status-on' : 'status-off'}">${inv.active ? 'Activa' : 'Bloqueada'}</span></td>
      <td><button class="small-btn secondary" data-action="toggle" data-id="${clean(inv.id)}" data-active="${inv.active}" type="button">${inv.active ? 'Bloquear' : 'Activar'}</button></td>
    </tr>`;
  }).join('');

  $('#summary-invitations').textContent = (data || []).length;
  $('#summary-cupos').textContent = totalCupos;
  $('#summary-ingresaron').textContent = totalIngresaron;
  $('#summary-disponibles').textContent = Math.max(0, totalCupos - totalIngresaron);

  body.querySelectorAll('[data-action="toggle"]').forEach((button) => {
    button.addEventListener('click', () => toggleInvitation(button.dataset.id, button.dataset.active === 'true'));
  });
  listMessage.textContent = data?.length ? `${data.length} invitación${data.length === 1 ? '' : 'es'} registradas.` : 'Todavía no hay invitaciones.';
}

async function toggleInvitation(id, active){
  if (!confirm(`¿Quieres ${active ? 'bloquear' : 'activar'} esta invitación?`)) return;
  const { error } = await supabase.from('invitations').update({ active: !active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { listMessage.textContent = error.message; return; }
  await loadInvitations();
}

$('#login').addEventListener('click', async () => {
  authMessage.textContent = 'Entrando…';
  const email = $('#email').value.trim();
  const password = $('#password').value;
  if (!email || !password) { authMessage.textContent = 'Escribe tu correo y contraseña.'; return; }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { authMessage.textContent = error.message; return; }
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    authMessage.textContent = 'Esta cuenta no tiene permisos de administrador.';
    return;
  }
  await refreshSession();
});

$('#signup').addEventListener('click', async () => {
  authMessage.textContent = 'Creando cuenta…';
  const email = $('#email').value.trim();
  const password = $('#password').value;
  if (!email || password.length < 6) { authMessage.textContent = 'Escribe un correo válido y una contraseña de al menos 6 caracteres.'; return; }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { authMessage.textContent = error.message; return; }
  authMessage.textContent = data.session ? 'Cuenta creada.' : 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.';
});

logout.addEventListener('click', async () => { await supabase.auth.signOut(); await refreshSession(); });

$('#create-invitation').addEventListener('click', async () => {
  formMessage.textContent = 'Generando código…';
  createdBox.classList.add('hidden');
  const name = $('#guest-name').value.trim();
  const total = Number($('#guest-total').value);
  const allowChildren = $('#allow-children').checked;
  if (!name || !Number.isInteger(total) || total < 1 || total > 100) {
    formMessage.textContent = 'Completa nombre y cupos correctamente.';
    return;
  }

  const { data, error } = await supabase.rpc('create_invitation', {
    p_name: name,
    p_total_guests: total,
    p_allow_children: allowChildren
  });
  const invitation = Array.isArray(data) ? data[0] : data;
  if (error || !invitation) {
    formMessage.textContent = error?.message || 'No se pudo crear el registro.';
    return;
  }

  formMessage.textContent = 'Registro creado correctamente.';
  createdBox.classList.remove('hidden');
  createdBox.innerHTML = `<strong>${clean(invitation.name)}</strong><br><span class="created-code">${clean(invitation.code)}</span><p class="notice">Este código es único y queda vinculado al control de entrada.</p>`;
  $('#guest-name').value = '';
  $('#guest-total').value = '2';
  $('#allow-children').checked = false;
  await loadInvitations();
});

async function refreshSession(){
  const admin = await isAdmin();
  authPanel.classList.toggle('hidden', admin);
  adminPanel.classList.toggle('hidden', !admin);
  logout.classList.toggle('hidden', !admin);
  if (admin) await loadInvitations();
}

supabase.auth.onAuthStateChange(() => refreshSession());
refreshSession();
