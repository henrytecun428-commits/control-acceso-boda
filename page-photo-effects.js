(() => {
  const site = document.querySelector('#invite');
  if (!site) return;
  const apply = () => {
    const cards = [...site.querySelectorAll('.gallery-card')];
    const urls = cards.map(c => {
      const bg = c.style.backgroundImage || '';
      const m = bg.match(/url\([\"']?(.*?)[\"']?\)/);
      return m ? m[1] : '';
    }).filter(Boolean);
    if (!urls.length) return false;
    const pages = {
      rsvp: urls[0],
      agenda: urls[1] || urls[0],
      regalos: urls[2] || urls[0],
      historia: urls[0],
      viaje: urls[3] || urls[1] || urls[0],
      faq: urls[2] || urls[1] || urls[0]
    };
    Object.entries(pages).forEach(([id,url]) => {
      const el = document.getElementById(id);
      if (el && url) {
        el.style.setProperty('--page-photo', `url("${url.replace(/"/g,'&quot;')}")`);
        el.classList.add('has-page-photo');
      }
    });
    return true;
  };
  let tries = 0;
  const timer = setInterval(() => {
    if (apply() || ++tries > 30) clearInterval(timer);
  }, 250);
})();
