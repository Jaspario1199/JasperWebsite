// ---------- mobile nav ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') navLinks.classList.remove('open');
  });
}

// ---------- scroll reveal ----------
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ---------- experience filters ----------
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.filter;
    document.querySelectorAll('.project-grid .card').forEach((card) => {
      card.classList.toggle('hide', cat !== 'all' && card.dataset.cat !== cat);
    });
  });
});

// ---------- lightbox (zoomable images on detail/cert pages) ----------
const lightbox = document.getElementById('lightbox');
const zoomables = Array.from(document.querySelectorAll('img.zoomable'));

if (lightbox && zoomables.length) {
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  let index = 0;

  const show = (i) => {
    index = (i + zoomables.length) % zoomables.length;
    const img = zoomables[index];
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = zoomables.length > 1 ? `${img.alt}  ·  ${index + 1}/${zoomables.length}` : img.alt;
  };

  const openLightbox = (i) => {
    show(i);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  zoomables.forEach((img, i) => img.addEventListener('click', () => openLightbox(i)));
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
