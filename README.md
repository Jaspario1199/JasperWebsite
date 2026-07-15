# Jasper Buntinx — Portfolio & Résumé Website

A multi-page portfolio site: plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies.

## Pages

```
index.html            # Home — summary, strengths/weaknesses, experience timeline, project tiles, contact
resume.html           # Resume — download links + embedded resume image
experiences.html      # All experiences — filterable tile grid, each tile links to a story page
certifications.html   # Certification gallery
experiences/          # One detail page per internship/project
  rochester-sensors.html · ecofil.html · cfd-optimization.html · creek-show.html
  vex-robotics.html · bike-lock.html · soccer-shots.html · tractor.html
```

Shared files: `styles.css` (design), `script.js` (mobile nav, filters, lightbox),
`favicon.svg`, `assets/img/` (web-optimized photos), `assets/docs/` (resume + portfolio PDFs).

Also in this repo: `phonestack/` — **PhoneStack**, a standalone social accountability
timer app (stack your phones, lock in together). Self-contained PWA, no build step;
see `phonestack/README.md`.

## Common edits

- **Add an experience** — copy any card block in `experiences.html` (set its `data-cat` to
  `internships`, `startup`, `teams`, or `personal`), then copy an existing page in `experiences/`
  as the detail page. Photos go in `assets/img/`.
- **Add a certification** — drop the certificate image in `assets/certs/`, then un-comment and fill in
  the template block already sitting in `certifications.html`.
- **Update the resume** — replace `assets/docs/Jasper_Buntinx_Resume.pdf` (same filename keeps all
  links working) and regenerate the preview image:
  `python3 -c "import pypdfium2 as p; p.PdfDocument('assets/docs/Jasper_Buntinx_Resume.pdf')[0].render(scale=2.2).to_pil().save('assets/img/resume-preview.png')"`
- **Accent color** — change `--accent` at the top of `styles.css`.

## Previewing locally

Open `index.html` in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Publishing with GitHub Pages (free hosting)

1. Merge this branch into your default branch.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch**, pick the default branch, folder `/ (root)`, save.
3. The site goes live at `https://jaspario1199.github.io/JasperWebsite/` within a minute or two.
4. Optional: add a custom domain (e.g. `jasperbuntinx.com`) in the same Pages settings screen.

Once live, put the URL at the top of your résumé and LinkedIn profile.
