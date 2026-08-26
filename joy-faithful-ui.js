(() => {
  const site = document.querySelector('#invite');
  if (!site) return;
  const bar = document.createElement('div');
  bar.className = 'joy-access-bar';
  bar.innerHTML = '<span class="joy-access-date" id="joy-bar-date">Tu invitación</span><button type="button" class="joy-access-btn" id="joy-bar-pass">Abrir pase</button>';
  document.body.appendChild(bar);
  const date = document.querySelector('#hero-date')?.textContent?.trim();
  const dateEl = document.querySelector('#joy-bar-date');
  if (date && dateEl) dateEl.textContent = date;
  document.querySelector('#joy-bar-pass')?.addEventListener('click', () => {
    document.querySelector('#view-pass-2')?.click();
  });
})();
