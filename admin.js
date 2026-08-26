import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const authPanel = document.querySelector('#auth-panel');
const adminPanel = document.querySelector('#admin-panel');
const logout = document.querySelector('#logout');
const authMessage = document.querySelector('#auth-message');
const formMessage = document.querySelector('#form-message');
const listMessage = document.querySelector('#list-message');
const body = document.querySelector('#invitations-body');

const clean = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c]));

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
  if (admin) await loadInvitations();
}

async function loadInvitations() {
  listMessage.textContent = 'Cargando...';
  const { data, error } = await supabase
    .from('invitations')
    .select('id,name,code,total_guests,allow_children,active,access_entries(people_count)')
    .order('created_at', { ascending: false });

  if (error) {
    listMessage.textContent = error.message;
    body.innerHTML = '';
    return;
  }

  body.innerHTML = data.map((inv) => {
    const used = (inv.access_entries || []).reduce((sum, entry) => sum + Number(entry.people_count || 0), 0);
    const available = Math.max(inv.total_guests - used, 0);
    return `<tr>
      <td><strong>${clean(inv.name)}</strong></td>
      <td><span class="pill">${clean(inv.code)}</span></td>
      <td>${inv.total_guests}</td>
      <td>${used}</td>
      <td>${available}</td>
      <td>${inv.allow_children ? 'Sí' : 'No'}</td>
      <td><span class="status ${inv.active ? 'status-on' : 'status-off'}">${inv.active ? 'Activa' : 'Bloqueada'}</span></td>
      <td><button class="secondary-link" data-action="toggle" data-id="${inv.id}" data-active="${inv.active}" type="button">${inv.active ? 'Bloquear' : 'Activar'}</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-action="toggle"]').forEach((button) => {
    button.addEventListener('click', () => toggleInvitation(button.dataset.id, button.dataset.active === 'true'));
  });
  listMessage.textContent = data.length ? `${data.length} invitación${data.length === 1 ? '' : 'es'} registradas.` : 'Todavía no hay invitaciones.';
}

async function toggleInvitation(id, active) {
  const action = active ? 'bloquear' : 'activar';
  if (!confirm(`¿Quieres ${action} esta invitación?`)) return;
  const { error } = await supabase.from('invitations').update({ active: !active }).eq('id', id);
  if (error) {
    listMessage.textContent = error.message;
    return;
  }
  await loadInvitations();
}

document.querySelector('#login').addEventListener('click', async () => {
  authMessage.textContent = 'Entrando...';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  if (!email || !password) {
    authMessage.textContent = 'Escribe tu correo y contraseña.';
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    authMessage.textContent = 'Esta cuenta no tiene permisos de administrador.';
    return;
  }

  authMessage.textContent = 'Sesión iniciada.';
  await refreshSession();
});

document.querySelector('#signup').addEventListener('click', async () => {
  authMessage.textContent = 'Creando cuenta...';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  if (!email || password.length < 6) {
    authMessage.textContent = 'Escribe un correo válido y una contraseña de al menos 6 caracteres.';
    return;
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
    return;
  }
  authMessage.textContent = data.session
    ? 'Cuenta creada. Comprueba que esta sea la cuenta administradora autorizada.'
    : 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.';
});

logout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  await refreshSession();
});

document.querySelector('#create-invitation').addEventListener('click', async () => {
  formMessage.textContent = 'Guardando...';
  const name = document.querySelector('#guest-name').value.trim();
  const code = document.querySelector('#guest-code').value.trim().toUpperCase();
  const total = Number(document.querySelector('#guest-total').value);
  const allowChildren = document.querySelector('#allow-children').checked;

  if (!name || !code || !Number.isInteger(total) || total < 1 || total > 100) {
    formMessage.textContent = 'Completa nombre, código y cupos correctamente.';
    return;
  }

  const { error } = await supabase.from('invitations').insert({
    name,
    code,
    total_guests: total,
    allow_children: allowChildren
  });

  if (error) {
    formMessage.textContent = error.code === '23505' ? 'Ese código ya existe. Elige otro.' : error.message;
    return;
  }

  formMessage.textContent = 'Invitación creada correctamente.';
  document.querySelector('#guest-name').value = '';
  document.querySelector('#guest-code').value = '';
  document.querySelector('#guest-total').value = '2';
  document.querySelector('#allow-children').checked = false;
  await loadInvitations();
});

supabase.auth.onAuthStateChange(() => refreshSession());
refreshSession();
