/**
 * ExpertEditorialThemeScheme — tenant: Marina (skin care edukacija)
 * Vrednosti su izvedene iz PsihointegritetUI tokena (_ds_bundle.css @theme).
 * Nema novih heks vrednosti: sve je token ili color-mix nad tokenom.
 */
export const ExpertEditorialThemeScheme = {
  colors: {
    canvas: 'var(--color-panel-canvas)', //  #faf8f3  topla krem podloga stranice
    surface: 'var(--color-surface)', //  #ffffff  kartice, svetle sekcije
    surfaceMuted: 'color-mix(in oklab, var(--color-meadow) 22%, var(--color-panel-canvas))', // meadow tint band
    text: 'var(--color-coffee)', //  #3a2e28
    textMuted: 'color-mix(in oklab, var(--color-coffee) 66%, transparent)',
    sage: 'var(--color-sage)', //  #8a9d82  eyebrow, numeracija
    terracotta: 'var(--color-warm)', //  #d1a48c  CTA band, akcenti
    accent: 'var(--color-forest)', //  #2e3b2e  naslovi, primarni CTA, dark sekcije
    accentContrast: 'var(--color-meadow)', //  #c6d5a8  tekst i CTA na forest podlozi
    border: 'color-mix(in oklab, var(--color-coffee) 12%, transparent)',
  },

  typography: {
    display: {
      family: 'var(--font-newsreader)',
      size: 'clamp(40px, 5.6vw, 78px)',
      lineHeight: 1.0,
      letterSpacing: '-0.028em',
      weight: 400,
      color: 'accent',
    },
    heading: {
      family: 'var(--font-newsreader)',
      size: 'clamp(30px, 3.7vw, 52px)',
      lineHeight: 1.05,
      letterSpacing: '-0.024em',
      weight: 400,
      color: 'accent',
    },
    body: {
      family: 'var(--font-instrument-sans)',
      size: '17px',
      lineHeight: 1.72,
      weight: 400,
      color: 'textMuted',
    },
    caption: {
      family: 'var(--font-instrument-sans)',
      size: '12.5px',
      lineHeight: 1.5,
      color: 'textMuted',
    },
    eyebrow: {
      family: 'var(--font-instrument-sans)',
      size: '11px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'sage',
      component: 'PsihointegritetUI.Eyebrow',
    },
  },

  content: {
    proseWidth: '64ch', //  telo teksta u stručnim tekstovima
    wideWidth: '1240px', //  glavni container svih sekcija
    sectionGap: 'clamp(56px, 7vw, 110px)', //  vertikalni padding sekcije
    paragraphGap: '20px',
    imageRadius: '28px', //  hero i portreti; kartice 20px, tile 12px
    tableStyle: 'rows', //  samo horizontalne linije coffee/12, bez vertikalnih
    calloutStyle: 'quote', //  surfaceMuted, radius 18px, serif 17px, bez ikonice
  },

  motion: {
    // Reveal (PsihointegritetUI.Reveal): opacity 0→1, y 28→0
    sectionTransition: {
      name: 'reveal-fade-up',
      duration: 700,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      trigger: 'in-view, once, amount 0.08',
    },
    mediaTransition: {
      name: 'hold-scale',
      from: 'scale(1)',
      to: 'scale(1.02)',
      duration: 600,
      easing: 'ease-out',
    },
    reducedMotion: 'static', //  bez transformacija i fade-a; Reveal to već poštuje
  },
};

export default ExpertEditorialThemeScheme;
