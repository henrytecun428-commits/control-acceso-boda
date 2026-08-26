import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const form = document.querySelector('#code-form');
const input = document.querySelector('#invite-code');
const result = document.querySelector('#result');

let currentInvitation = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function renderInvitation(invitation) {
  currentInvitation = invitation;
  const available = Math.max(invitation.available_guests, 0);
  result.hidden = false;
  result.className = `result-panel ${available > 0 ? 'success' : 'error'}`;

  if (available <= 0) {
    result.innerHTML = `
      <div class="result-status">✕ Cupo agotado</div>
      <h2 class="guest-name">${escapeHtml(invitation.name)}</h2>
      <div class="stats">
        <div class="stat"><strong>${invitation.total_guests}</strong><span>Autorizados</span></div>
        <div class="stat"><strong>${invitation.used_guests}</strong><span>Ingresaron</span></div>
        <div class="stat"><strong>0</strong><span>Disponibles</span></div>
      </div>`;
    return;
  }

  result.innerHTML = `
    <div class="result-status">✓ Invitación válida</div>
    <h2 class="guest-name">${escapeHtml(invitation.name)}</h2>
    <div class="stats">
      <div class="stat"><strong>${invitation.total_guests}</strong><span>Autorizados</span></div>
      <div class="stat"><strong>${invitation.used_guests}</strong><span>Ingresaron</span></div>
      <div class="stat"><strong>${available}</strong><span>Disponibles</span></div>
    </div>
    <div class="entry-box">
      <label for="people-count">Personas que ingresan</label>
      <div class="stepper">
        <button type="button" id="minus-person">−</button>
        <strong id="people-count-value">1</strong>
        <button type="button" id="plus-person">+</button>
      </div>
      <div class="children-row">
        <span>¿Hay niños?</span>
        <select id="children-count" ${invitation.allow_children ? '' : 'disabled'}>
          ${Array.from({length: available + 1}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
        </select>
      </div>
      <button type="button" id="register-entry" class="confirm-button">Confirmar entrada</button>
      ${invitation.allow_children ? '<p class="helper">Esta invitación permite niños.</p>' : '<p class="helper">Esta invitación no permite niños.</p>'}
    </div>`;

  let people = 1;
  const value = result.querySelector('#people-count-value');
  const minus = result.querySelector('#minus-person');
  const plus = result.querySelector('#plus-person');
  const children = result.querySelector('#children-count');
  const register = result.querySelector('#register-entry');

  const sync = () => {
    value.textContent = people;
    plus.disabled = people >= available;
    minus.disabled = people <= 1;
    if (children.value > people) children.value = people;
    if (children.options.length > people + 1) {
      [...children.options].forEach((option) => option.hidden = Number(option.value) > people);
    }
  };

  minus.addEventListener('click', () => { people--; sync(); });
  plus.addEventListener('click', () => { people++; sync(); });
  register.addEventListener('click', async () => {
    const childrenCount = Number(children.value || 0);
    register.disabled = true;
    register.textContent = 'Registrando...';

    const { data, error } = await supabase.rpc('register_entry', {
      p_code: invitation.code,
      p_people_count: people,
      p_children_count: childrenCount
    });

    const response = Array.isArray(data) ? data[0] : data;
    if (error || !response?.success) {
      result.className = 'result-panel error';
      result.innerHTML = `<div class="result-status">✕ No se pudo registrar</div><p class="message">${escapeHtml(response?.message || error?.message || 'Inténtalo nuevamente.')}</p>`;
      return;
    }

    result.className = 'result-panel success';
    result.innerHTML = `
      <div class="result-status">✓ Acceso autorizado</div>
      <h2 class="guest-name">${escapeHtml(response.name)}</h2>
      <div class="success-number">${people} ${people === 1 ? 'PERSONA' : 'PERSONAS'}</div>
      <p class="message">Entrada registrada correctamente.</p>
      <div class="stats">
        <div class="stat"><strong>${response.total_guests}</strong><span>Autorizados</span></div>
        <div class="stat"><strong>${response.used_guests}</strong><span>Ingresaron</span></div>
        <div class="stat"><strong>${response.available_guests}</strong><span>Disponibles</span></div>
      </div>`;
  });

  sync();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = input.value.trim().toUpperCase();
  if (!code) return;

  result.hidden = false;
  result.className = 'result-panel';
  result.innerHTML = '<div class="result-status">Verificando...</div>';

  const { data, error } = await supabase.rpc('verify_invitation', { p_code: code });
  const invitation = Array.isArray(data) ? data[0] : data;

  if (error || !invitation) {
    result.className = 'result-panel error';
    result.innerHTML = `
      <div class="result-status">✕ Código no encontrado</div>
      <p class="message">Revisa el código e inténtalo nuevamente.</p>`;
    currentInvitation = null;
    return;
  }

  renderInvitation(invitation);
});
