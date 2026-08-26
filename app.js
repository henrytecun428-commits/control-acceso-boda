import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const form = document.querySelector('#code-form');
const input = document.querySelector('#invite-code');
const result = document.querySelector('#result');
const scanButton = document.querySelector('#scan-qr');
const clearButton = document.querySelector('#clear-check');
const cameraModal = document.querySelector('#camera-modal');
const video = document.querySelector('#qr-video');
const cameraNote = document.querySelector('#camera-note');
const cameraClose = document.querySelector('#camera-close');
const autoCode = document.querySelector('#auto-code');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}
function normalizeCode(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  try { const url = new URL(value); const fromQuery = url.searchParams.get('code'); if (fromQuery) return fromQuery.trim().toUpperCase(); } catch {}
  return value.toUpperCase();
}
async function verifyCode(rawCode) {
  const code = normalizeCode(rawCode); if (!code) return;
  input.value = code; result.hidden = false; result.className = 'result-panel'; result.innerHTML = '<div class="result-status">Verificando…</div>';
  const { data, error } = await supabase.rpc('verify_invitation', { p_code: code });
  const invitation = Array.isArray(data) ? data[0] : data;
  if (error || !invitation) { result.className='result-panel error'; result.innerHTML='<div class="result-status">✕ Código no encontrado</div><p class="message">Revisa el código e inténtalo nuevamente.</p>'; return; }
  renderInvitation(invitation);
}
function renderInvitation(invitation) {
  const available=Math.max(Number(invitation.available_guests||0),0);
  result.hidden=false; result.className=`result-panel ${available>0?'success':'error'}`;
  if(available<=0){result.innerHTML=`<div class="result-status">✕ Cupo agotado</div><h2 class="guest-name">${escapeHtml(invitation.name)}</h2><div class="stats"><div class="stat"><strong>${invitation.total_guests}</strong><span>Autorizados</span></div><div class="stat"><strong>${invitation.used_guests}</strong><span>Ingresaron</span></div><div class="stat"><strong>0</strong><span>Disponibles</span></div></div>`;return;}
  result.innerHTML=`<div class="result-status">✓ Invitación válida</div><h2 class="guest-name">${escapeHtml(invitation.name)}</h2><div class="stats"><div class="stat"><strong>${invitation.total_guests}</strong><span>Autorizados</span></div><div class="stat"><strong>${invitation.used_guests}</strong><span>Ingresaron</span></div><div class="stat"><strong>${available}</strong><span>Disponibles</span></div></div><div class="entry-box"><label for="people-count">Personas que ingresan</label><div class="stepper"><button type="button" id="minus-person" aria-label="Restar">−</button><strong id="people-count-value">1</strong><button type="button" id="plus-person" aria-label="Sumar">+</button></div><div class="children-row"><span>¿Hay niños?</span><select id="children-count" ${invitation.allow_children?'':'disabled'}>${Array.from({length:available+1},(_,i)=>`<option value="${i}">${i}</option>`).join('')}</select></div><button type="button" id="register-entry" class="confirm-button">Confirmar entrada</button>${invitation.allow_children?'<p class="helper">Esta invitación permite niños.</p>':'<p class="helper">Esta invitación no permite niños.</p>'}</div>`;
  let people=1; const value=result.querySelector('#people-count-value'),minus=result.querySelector('#minus-person'),plus=result.querySelector('#plus-person'),children=result.querySelector('#children-count'),register=result.querySelector('#register-entry');
  const sync=()=>{value.textContent=people;plus.disabled=people>=available;minus.disabled=people<=1;[...children.options].forEach(o=>o.hidden=Number(o.value)>people);if(Number(children.value)>people)children.value=String(people)};
  minus.addEventListener('click',()=>{people=Math.max(1,people-1);sync()}); plus.addEventListener('click',()=>{people=Math.min(available,people+1);sync()});
  register.addEventListener('click',async()=>{const childrenCount=Number(children.value||0);register.disabled=true;register.textContent='Registrando…';const{data,error}=await supabase.rpc('register_entry',{p_code:invitation.code,p_people_count:people,p_children_count:childrenCount});const response=Array.isArray(data)?data[0]:data;if(error||!response?.success){result.className='result-panel error';result.innerHTML=`<div class="result-status">✕ No se pudo registrar</div><p class="message">${escapeHtml(response?.message||error?.message||'Inténtalo nuevamente.')}</p>`;return;}result.className='result-panel success';result.innerHTML=`<div class="result-status">✓ ACCESO AUTORIZADO</div><h2 class="guest-name">${escapeHtml(response.name)}</h2><div class="success-number">${people} ${people===1?'PERSONA':'PERSONAS'}</div><p class="message">Entrada registrada correctamente.</p><div class="stats"><div class="stat"><strong>${response.total_guests}</strong><span>Autorizados</span></div><div class="stat"><strong>${response.used_guests}</strong><span>Ingresaron</span></div><div class="stat"><strong>${response.available_guests}</strong><span>Disponibles</span></div></div>`});
  sync();
}
form.addEventListener('submit',async(e)=>{e.preventDefault();await verifyCode(input.value)});
clearButton.addEventListener('click',()=>{input.value='';result.hidden=true;autoCode.textContent='';input.focus()});
let stream=null,scanning=false,detector=null,scanTimer=null;
function stopScanner(){scanning=false;if(scanTimer){clearTimeout(scanTimer);scanTimer=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null;cameraModal.classList.add('hidden')}
async function scanLoop(){if(!scanning||!detector||video.readyState<2)return;try{const codes=await detector.detect(video);if(codes?.length){const raw=codes[0].rawValue||'';if(raw){stopScanner();autoCode.textContent='QR reconocido ✓';await verifyCode(raw);return}}}catch{}scanTimer=setTimeout(scanLoop,280)}
async function startScanner(){cameraModal.classList.remove('hidden');cameraNote.textContent='Preparando cámara…';if(!navigator.mediaDevices?.getUserMedia){cameraNote.textContent='Este navegador no permite cámara. Usa el código manual.';return}if(!('BarcodeDetector' in window)){cameraNote.textContent='El lector QR automático no está disponible en este navegador. Usa el código manual.';return}try{detector=new BarcodeDetector({formats:['qr_code']});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;await video.play();scanning=true;cameraNote.textContent='Apunta al QR del pase…';scanLoop()}catch(error){cameraNote.textContent=error?.name==='NotAllowedError'?'Permiso de cámara rechazado. Puedes usar el código manual.':'No se pudo abrir la cámara. Usa el código manual.'}}
scanButton.addEventListener('click',startScanner);cameraClose.addEventListener('click',stopScanner);cameraModal.addEventListener('click',(e)=>{if(e.target===cameraModal)stopScanner()});document.addEventListener('keydown',(e)=>{if(e.key==='Escape')stopScanner()});
const initialCode=new URLSearchParams(location.search).get('code');if(initialCode){input.value=normalizeCode(initialCode);autoCode.textContent='Código recibido desde QR/enlace ✓';verifyCode(initialCode)}
