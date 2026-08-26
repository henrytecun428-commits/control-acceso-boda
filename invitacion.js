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
  requestAnimationFrame(() => document.querySelectorAll('.reveal').forEach((el) => observer.observe(el)));
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
      window.QRCode.toCanvas(canvas, value, { width: 164, margin: 1 }, (error) => {
        if (error) target.innerHTML = '<span class="tiny">QR no disponible</span>';
      });
    } else target.innerHTML = '<span class="tiny">QR no disponible</span>';
  };
  document.head.appendChild(script);
}

function setupCountdown(rawDate) {
  const box = $('#countdown');
  if (!box || !rawDate) return;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return;
  box.hidden = false;
  const tick = () => {
    const remaining = parsed.getTime() - Date.now();
    if (remaining <= 0) {
      ['#days','#hours','#minutes','#seconds'].forEach((s) => setText(s, '0'));
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    setText('#days', Math.floor(totalSeconds / 86400));
    setText('#hours', Math.floor((totalSeconds % 86400) / 3600));
    setText('#minutes', Math.floor((totalSeconds % 3600) / 60));
    setText('#seconds', totalSeconds % 60);
  };
  tick();
  setInterval(tick, 1000);
}

function setupGallery() {
  const cards = [...document.querySelectorAll('.gallery-card')];
  const lightbox = $('#lightbox');
  const art = $('#lightbox-art');
  const caption = $('#lightbox-caption');
  const close = $('#lightbox-close');
  if (!cards.length || !lightbox || !art || !caption || !close) return;

  const demoArt = [
    'linear-gradient(145deg,#5f6d64,#cbbda5)',
    'linear-gradient(145deg,#e1d8c9,#8c806b)',
    'linear-gradient(145deg,#768175,#c9b896)',
    'linear-gradient(145deg,#d5c8b0,#516159)'
  ];
  const captions = ['Un momento para recordar','Juntos','Nuestro día','Siempre'];
  const open = (index) => {
    art.style.backgroundImage = demoArt[index] || demoArt[0];
    caption.textContent = captions[index] || 'Un momento especial';
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };
  const shut = () => { lightbox.classList.add('hidden'); document.body.style.overflow = ''; };
  cards.forEach((card) => card.addEventListener('click', () => open(Number(card.dataset.galleryIndex || 0))));
  close.addEventListener('click', shut);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) shut(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') shut(); });
}

function celebrate() {
  const burst = document.createElement('div');
  burst.className = 'celebration';
  for (let i = 0; i < 18; i += 1) {
    const piece = document.createElement('span');
    piece.textContent = i % 2 ? '✦' : '·';
    piece.style.setProperty('--x', `${(Math.random() - .5) * 280}px`);
    piece.style.setProperty('--y', `${-80 - Math.random() * 180}px`);
    piece.style.setProperty('--r', `${(Math.random() - .5) * 240}deg`);
    burst.appendChild(piece);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1100);
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

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });

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
  setText('#faq-parking', invite.parking_text);
  setText('#dress-code', invite.dress_code);
  setText('#dress-code-alt', invite.dress_code);
  setText('#gift-text', invite.gift_text);
  setText('#total-guests', invite.total_guests);
  setText('#code', invite.code);
  setText('#faq-children', invite.allow_children ? 'Sí. Esta invitación permite niños.' : 'Esta invitación está configurada sin niños.');

  setLink('#maps-link', invite.maps_url);
  setLink('#waze-link', invite.waze_url);
  setLink('#gift-link', invite.gift_url);

  if (invite.hero_image_url) {
    const hero = $('.hero');
    hero.style.backgroundImage = `url("${String(invite.hero_image_url).replace(/"/g, '%22')}")`;
  }

  // Si el administrador utiliza una fecha ISO (por ejemplo 2026-09-26T16:00:00-06:00), aparece el contador.
  setupCountdown(invite.event_date);
  renderQr(`${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(invite.code)}`);
  setupGallery();

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
    if (ok) { celebrate(); document.querySelector('.access').scrollIntoView({ behavior: 'smooth' }); }
    confirm.disabled = false;
    decline.disabled = false;
  });
  decline.addEventListener('click', async () => {
    if (!window.confirm('¿Seguro que deseas indicar que no podrás asistir?')) return;
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
