import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const loading = document.querySelector('#loading');
const site = document.querySelector('#invite');
const code = new URLSearchParams(window.location.search).get('code');

const $ = (selector) => document.querySelector(selector);
const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value ?? ''; };

function revealSite() {
  loading.classList.add('hidden');
  site.classList.remove('hidden');
}

function setLink(selector, url) {
  const el = $(selector);
  if (!el) return;
  if (url) { el.href = url; el.classList.remove('hidden'); }
  else { el.classList.add('hidden'); }
}

function renderQr(value) {
  const target = $('#qr');
  if (!target) return;
  target.innerHTML = '';
  const canvas = document.createElement('canvas');
  target.appendChild(canvas);
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
  script.onload = () => {
    if (window.QRCode?.toCanvas) {
      window.QRCode.toCanvas(canvas, value, { width: 156, margin: 1 }, (error) => {
        if (error) target.innerHTML = '<span class="tiny">QR no disponible</span>';
      });
    } else target.innerHTML = '<span class="tiny">QR no disponible</span>';
  };
  document.head.appendChild(script);
}

async function updateRsvp(messageElement, count, status) {
  messageElement.textContent = 'Guardando…';
  const { data, error } = await supabase.rpc('update_rsvp', {
    p_code: code,
    p_confirmed_guests: count,
    p_status: status
  });
  const response = Array.isArray(data) ? data[0] : data;
  if (error || !response?.success) {
    messageElement.textContent = response?.message || error?.message || 'No se pudo guardar la respuesta.';
    return false;
  }
  messageElement.textContent = status === 'confirmed'
    ? `¡Perfecto! Confirmaste ${response.confirmed_guests} ${response.confirmed_guests === 1 ? 'persona' : 'personas'}.`
    : 'Hemos registrado que no podrás acompañarnos.';
  return true;
}

async function init() {
  if (!code) {
    loading.textContent = 'Esta invitación necesita un código.';
    return;
  }

  const { data, error } = await supabase.rpc('get_public_invitation', { p_code: code });
  const invite = Array.isArray(data) ? data[0] : data;

  if (error || !invite) {
    loading.textContent = 'Esta invitación no está disponible.';
    return;
  }

  setText('#guest-name', invite.guest_name);
  setText('#rsvp-guest', invite.guest_name);
  setText('#couple-names', invite.couple_names);
  setText('#footer-couple', invite.couple_names);
  setText('#hero-date', invite.event_date);
  setText('#welcome-text', invite.welcome_text);
  setText('#reception-time', invite.reception_time);
  setText('#ceremony-time', invite.ceremony_time);
  setText('#venue-name', invite.venue_name);
  setText('#venue-address', invite.venue_address);
  setText('#parking-text', invite.parking_text);
  setText('#dress-code', invite.dress_code);
  setText('#gift-text', invite.gift_text);
  setText('#total-guests', invite.total_guests);
  setText('#code', invite.code);

  setLink('#maps-link', invite.maps_url);
  setLink('#waze-link', invite.waze_url);
  setLink('#gift-link', invite.gift_url);

  if (invite.hero_image_url) {
    const hero = $('.hero');
    hero.style.backgroundImage = `url("${String(invite.hero_image_url).replace(/"/g, '%22')}")`;
  }

  renderQr(`${window.location.origin}${window.location.pathname.replace(/invitacion\.html$/, '')}invitacion.html?code=${encodeURIComponent(invite.code)}`);

  let count = Math.max(1, Math.min(Number(invite.confirmed_guests || 1), Number(invite.total_guests)));
  setText('#count', count);
  const minus = $('#minus');
  const plus = $('#plus');
  const confirm = $('#confirm');
  const decline = $('#decline');
  const message = $('#rsvp-message');

  const sync = () => {
    setText('#count', count);
    minus.disabled = count <= 1;
    plus.disabled = count >= invite.total_guests;
  };

  minus.addEventListener('click', () => { count = Math.max(1, count - 1); sync(); });
  plus.addEventListener('click', () => { count = Math.min(Number(invite.total_guests), count + 1); sync(); });
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    decline.disabled = true;
    const ok = await updateRsvp(message, count, 'confirmed');
    if (ok) document.querySelector('.access').scrollIntoView({ behavior: 'smooth' });
    confirm.disabled = false;
    decline.disabled = false;
  });
  decline.addEventListener('click', async () => {
    if (!confirm('¿Seguro que deseas indicar que no podrás asistir?')) return;
    confirm.disabled = true;
    decline.disabled = true;
    await updateRsvp(message, 0, 'declined');
    confirm.disabled = false;
    decline.disabled = false;
  });

  sync();
  revealSite();
}

init();
