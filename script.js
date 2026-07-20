// mobile nav
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
}

// portfolio filters
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('item-active'));
    btn.classList.add('item-active');
    const cat = btn.dataset.filter;
    document.querySelectorAll('.tile-grid .tile').forEach((tile) => {
      tile.classList.toggle('hide', cat !== 'all' && tile.dataset.cat !== cat);
    });
  });
});

// expandable grouped sets (learning track, certificate groups).
// Any control with [aria-controls] pointing at a group toggles it; a group
// can have several controls (e.g. a cover photo + a button) that stay in sync.
const groupControls = document.querySelectorAll('.track-toggle, .group-cover-photo');
const groups = {};
groupControls.forEach((ctrl) => {
  const id = ctrl.getAttribute('aria-controls');
  if (!id) return;
  (groups[id] = groups[id] || []).push(ctrl);
});
Object.keys(groups).forEach((id) => {
  const target = document.getElementById(id);
  const controls = groups[id];
  const setState = (expanded) => {
    if (target) target.hidden = !expanded;
    controls.forEach((c) => {
      c.setAttribute('aria-expanded', String(expanded));
      c.classList.toggle('open', expanded);
      const label = c.querySelector('.toggle-label');
      if (label) {
        if (!c.dataset.showText) c.dataset.showText = label.textContent;
        label.textContent = expanded ? (c.dataset.hideText || 'Hide') : c.dataset.showText;
      }
    });
  };
  controls.forEach((c) => c.addEventListener('click', (e) => {
    e.preventDefault();
    setState(c.getAttribute('aria-expanded') !== 'true');
  }));
});

// lightbox for zoomable images (only cycles through currently-visible ones)
const lightbox = document.getElementById('lightbox');
const zoomables = Array.from(document.querySelectorAll('img.zoomable'));

if (lightbox && zoomables.length) {
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  let active = zoomables;
  let index = 0;

  const show = (i) => {
    index = (i + active.length) % active.length;
    const img = active[index];
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = active.length > 1 ? `${img.alt} (${index + 1}/${active.length})` : img.alt;
  };

  const openLightbox = (img) => {
    active = zoomables.filter(isVisible);
    show(active.indexOf(img));
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  zoomables.forEach((img) => img.addEventListener('click', () => openLightbox(img)));
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', (e) => { e.stopPropagation(); show(index - 1); });
  document.getElementById('lbNext').addEventListener('click', (e) => { e.stopPropagation(); show(index + 1); });
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
}
