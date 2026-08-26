const form = document.querySelector('#code-form');
const input = document.querySelector('#invite-code');
const result = document.querySelector('#result');

// Datos de demostración. Más adelante se reemplazan por la base de datos en la nube.
const demoInvitations = {
  ALE123: { name: 'Alejandro', total: 5, used: 2, children: false },
  MAR456: { name: 'María', total: 3, used: 0, children: true }
};

function showResult(invitation) {
  const available = invitation.total - invitation.used;
  result.hidden = false;
  result.className = `result-panel ${available > 0 ? 'success' : 'error'}`;

  if (available <= 0) {
    result.innerHTML = `
      <div class="result-status">✕ Cupo agotado</div>
      <h2 class="guest-name">${invitation.name}</h2>
      <div class="stats">
        <div class="stat"><strong>${invitation.total}</strong><span>Autorizados</span></div>
        <div class="stat"><strong>${invitation.used}</strong><span>Ingresaron</span></div>
        <div class="stat"><strong>0</strong><span>Disponibles</span></div>
      </div>`;
    return;
  }

  result.innerHTML = `
    <div class="result-status">✓ Invitación válida</div>
    <h2 class="guest-name">${invitation.name}</h2>
    <div class="stats">
      <div class="stat"><strong>${invitation.total}</strong><span>Autorizados</span></div>
      <div class="stat"><strong>${invitation.used}</strong><span>Ingresaron</span></div>
      <div class="stat"><strong>${available}</strong><span>Disponibles</span></div>
    </div>`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = input.value.trim().toUpperCase();
  const invitation = demoInvitations[code];

  if (!invitation) {
    result.hidden = false;
    result.className = 'result-panel error';
    result.innerHTML = `
      <div class="result-status">✕ Código no encontrado</div>
      <p style="margin:0;color:#69716c;font-size:14px;line-height:1.5;">Revisa el código e inténtalo nuevamente.</p>`;
    return;
  }

  showResult(invitation);
});
