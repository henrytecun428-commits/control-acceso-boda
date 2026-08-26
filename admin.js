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

const clean = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

async function refreshSession() {
  const logged = await isAdmin();
  authPanel.classList.toggle('hidden', logged);
  adminPanel.classList.toggle('hidden', !logged);
  logout.classList.toggle('hidden', !logged);
  if (logged) await loadInvitations();
}

async function loadInvitations() {
  listMessage.textContent = 'Cargando...';
  const { data, error } = await supabase
    .from('invitations')
    .select('id,name,code,total_guests,allow_children,active,access_entries(people_count)')
    .order('created_at', { ascending: false });

  if (error) {
    listMessage.textContent = error.message;
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
      <td>${inv.active ? 'Activa' : 'Bloqueada'}</td>
      <td><button class="danger-link" data-id="${inv.id}" type="button">Eliminar</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-id]').forEach((button) => {
    button.addEventListener('click', () => deleteInvitation(button.dataset.id));
  });
  listMessage.textContent = data.length ? '' : 'Todavía no hay invitaciones.';
}

async function deleteInvitation(id) {
  if (!confirm('¿Eliminar esta invitación? Solo hazlo si estás seguro.')) return;
  const { error } = await supabase.from('invitations').delete().eq('id', id);
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  authMessage.textContent = error ? error.message : 'Sesión iniciada.';
  if (!error) await refreshSession();
});

document.querySelector('#signup').addEventListener('click', async () => {
  authMessage.textContent = 'Creando cuenta...';
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  if (password.length < 6) {
    authMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
    return;
  }
  authMessage.textContent = data.session ? 'Cuenta creada.' : 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.';
  if (data.session) await refreshSession();
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

  if (!name || !code || !Number.isInteger(total) || total < 1) {
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
