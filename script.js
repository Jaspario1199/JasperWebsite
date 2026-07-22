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

// home skills search with type-ahead autocomplete
const skillInput = document.getElementById('skillSearchHome');
if (skillInput) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const E = (l, h) => [l, h];
  const SKILLS = [
    { n: 'SolidWorks', c: 'CAD', alt: 'cad modeling assembly', u: [E('ECOFIL','experiences/ecofil.html'),E('Creek Show','experiences/creek-show.html'),E('Rochester Sensors','experiences/rochester-sensors.html'),E('Bike Lock','experiences/bike-lock.html'),E('Soccer Shots','experiences/soccer-shots.html')] },
    { n: 'SolidWorks Simulation (FEA)', c: 'CAD', alt: 'fea finite element analysis stress thermal', u: [E('Rochester Sensors','experiences/rochester-sensors.html'),E('ECOFIL','experiences/ecofil.html'),E('Creek Show','experiences/creek-show.html')] },
    { n: 'ANSYS', c: 'CAD', alt: 'fea finite element analysis simulation', u: [E('Creek Show','experiences/creek-show.html')] },
    { n: 'GD&T', c: 'CAD', alt: 'geometric dimensioning tolerancing', u: [E('Rochester Sensors','experiences/rochester-sensors.html'),E('ECOFIL','experiences/ecofil.html')] },
    { n: 'AutoCAD', c: 'CAD', alt: 'cad schematic drafting', u: [E('VEX U Robots','experiences/vex-robotics.html')] },
    { n: 'Fusion 360 CAM', c: 'CAD', alt: 'cam toolpath', u: [E('Creek Show','experiences/creek-show.html')] },
    { n: 'ParaView', c: 'CAD', alt: 'post processing visualization cfd', u: [E('CUDA CFD','experiences/cfd-optimization.html')] },
    { n: 'CSWA Certified', c: 'CAD', alt: 'cad certification solidworks', u: [E('Certifications','certifications.html')] },
    { n: 'OnShape', c: 'CAD', alt: 'cad modeling', u: [E('Coursework & personal',null)] },
    { n: 'Creo', c: 'CAD', alt: 'cad ptc', u: [E('Coursework',null)] },
    { n: 'Siemens NX', c: 'CAD', alt: 'cad unigraphics', u: [E('Coursework',null)] },
    { n: 'MATLAB', c: 'CAD', alt: 'numerical computing matrix', u: [E('Coursework',null)] },
    { n: 'CNC Machining (CamWorks)', c: 'Manufacturing', alt: 'cnc milling solidworks cam machining toolpath', u: [E('Rochester Sensors','experiences/rochester-sensors.html'),E('ECOFIL','experiences/ecofil.html')] },
    { n: '3D Printing (OrcaSlicer)', c: 'Manufacturing', alt: 'additive manufacturing fdm printing', u: [E('ECOFIL','experiences/ecofil.html'),E('Bike Lock','experiences/bike-lock.html'),E('Soccer Shots','experiences/soccer-shots.html')] },
    { n: 'Laser Cutting (Lightburn)', c: 'Manufacturing', alt: 'laser cutting', u: [E('ECOFIL','experiences/ecofil.html'),E('Creek Show','experiences/creek-show.html')] },
    { n: 'MIG Welding', c: 'Manufacturing', alt: 'welding fabrication metal', u: [E('Creek Show','experiences/creek-show.html'),E('ECOFIL','experiences/ecofil.html'),E('Electric Tractor','experiences/tractor.html')] },
    { n: 'Metalworking', c: 'Manufacturing', alt: 'metal fabrication', u: [E('Creek Show','experiences/creek-show.html'),E('Electric Tractor','experiences/tractor.html')] },
    { n: 'Soldering', c: 'Manufacturing', alt: 'electronics wiring', u: [E('ECOFIL','experiences/ecofil.html'),E('Creek Show','experiences/creek-show.html')] },
    { n: 'Environmental Testing', c: 'Manufacturing', alt: 'thermal cycling salt spray vibration qualification', u: [E('Rochester Sensors','experiences/rochester-sensors.html')] },
    { n: 'Injection Molding', c: 'Manufacturing', alt: 'molding plastics', u: [E('Coursework',null)] },
    { n: 'Woodworking', c: 'Manufacturing', alt: 'wood fabrication', u: [E('Personal projects',null)] },
    { n: 'CUDA', c: 'Programming', alt: 'gpu parallel computing kernel', u: [E('CUDA CFD','experiences/cfd-optimization.html')] },
    { n: 'C++', c: 'Programming', alt: 'programming language', u: [E('CUDA CFD','experiences/cfd-optimization.html')] },
    { n: 'Python', c: 'Programming', alt: 'scripting programming language', u: [E('CUDA CFD','experiences/cfd-optimization.html')] },
    { n: 'NVIDIA Nsight Compute', c: 'Programming', alt: 'gpu profiling nvidia', u: [E('CUDA CFD','experiences/cfd-optimization.html')] },
    { n: 'HTML', c: 'Programming', alt: 'web markup', u: [E('This site',null)] },
    { n: 'Java', c: 'Programming', alt: 'programming language', u: [E('Coursework',null)] },
    { n: 'Arduino', c: 'Electronics', alt: 'microcontroller nano embedded', u: [E('ECOFIL','experiences/ecofil.html'),E('Bike Lock','experiences/bike-lock.html')] },
    { n: 'Sensors & Instrumentation', c: 'Electronics', alt: 'hall effect thermistor hygrometer', u: [E('ECOFIL','experiences/ecofil.html')] },
    { n: 'RFID', c: 'Electronics', alt: 'access control scanner', u: [E('Bike Lock','experiences/bike-lock.html')] },
    { n: 'Solenoids & Actuators', c: 'Electronics', alt: 'actuator', u: [E('Bike Lock','experiences/bike-lock.html')] },
    { n: 'Mechanism Design', c: 'Electronics', alt: 'linkage design', u: [E('VEX U Robots','experiences/vex-robotics.html'),E('Soccer Shots','experiences/soccer-shots.html')] },
  ];
  const ac = document.getElementById('skillAc');
  const results = document.getElementById('skillResults');
  // category keywords make the search "smart": a query like "manufacturing",
  // "fabrication", "design", "software", or "circuits" surfaces the whole area.
  const CAT_KW = {
    CAD: 'cad computer aided design simulation modeling drafting analysis geometry',
    Manufacturing: 'manufacturing fabrication machining making shop build prototyping hands on',
    Programming: 'programming computing software coding development scripting',
    Electronics: 'electronics controls circuits hardware embedded wiring instrumentation mechatronics',
  };
  const hay = (s) => (s.n + ' ' + s.alt + ' ' + s.c + ' ' + (CAT_KW[s.c] || '') + ' ' + s.u.map((x) => x[0]).join(' ')).toLowerCase();
  let current = [], active = -1;

  const cardHtml = (s) => {
    const chips = s.u.map(([l, h]) => h ? `<a href="${h}">${esc(l)}</a>` : `<span class="skill-use-muted">${esc(l)}</span>`).join('');
    return `<div class="skill-result-card"><span class="skill-name">${esc(s.n)}</span><div class="skill-uses">${chips}</div></div>`;
  };
  const showResult = (s) => { ac.hidden = true; results.innerHTML = cardHtml(s); };
  const showAll = (list) => { ac.hidden = true; results.innerHTML = list.map(cardHtml).join(''); };

  const renderAc = (q) => {
    current = SKILLS.filter((s) => hay(s).includes(q));
    active = -1;
    if (!current.length) { ac.hidden = true; return; }
    let html = '';
    if (q && current.length > 1) {
      html += `<button type="button" class="skill-ac-item skill-ac-all" data-all="1"><span>Show all ${current.length} matches</span><span class="ac-cat">${esc(q)}</span></button>`;
    }
    html += current.map((s, i) =>
      `<button type="button" class="skill-ac-item" data-i="${i}"><span>${esc(s.n)}</span><span class="ac-cat">${esc(s.c)}</span></button>`).join('');
    ac.innerHTML = html;
    ac.hidden = false;
  };

  const openAc = () => renderAc(skillInput.value.trim().toLowerCase());
  skillInput.addEventListener('focus', openAc);
  skillInput.addEventListener('input', () => { results.innerHTML = ''; openAc(); });
  ac.addEventListener('click', (e) => {
    const btn = e.target.closest('.skill-ac-item');
    if (!btn) return;
    if (btn.dataset.all) { showAll(current); return; }
    const s = current[+btn.dataset.i];
    skillInput.value = s.n;
    showResult(s);
  });
  skillInput.addEventListener('keydown', (e) => {
    if (ac.hidden) return;
    const items = [...ac.querySelectorAll('.skill-ac-item')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); (items[active] || items[0]).click(); return; }
    else if (e.key === 'Escape') { ac.hidden = true; return; }
    else return;
    items.forEach((it, i) => it.classList.toggle('active', i === active));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.hero-search')) ac.hidden = true; });
}

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
