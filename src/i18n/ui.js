export const languages = { en: 'English', es: 'Español' };

export function getLangFromUrl(url) {
  return url.pathname === '/es' || url.pathname.startsWith('/es/') ? 'es' : 'en';
}

export function stripLang(pathname) {
  return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
}

export function localePath(lang, path) {
  return lang === 'es' ? `/es${path}` : path;
}

export const ui = {
  en: {
    nav: { home: 'Home', contact: 'Contact', switchLabel: 'Language' },
    footer: {
      terms: 'Terms of Use',
      privacy: 'Privacy Policy',
      delete: 'Delete your account',
      social: 'Follow us soon — social links on the way',
    },
    home: {
      title: 'Home',
      description: 'Little Monge Studios — independent studio making games and apps.',
      heroText: 'Independent studio making games and apps. Small worlds, made with care.',
      eyebrow: 'Projects',
      sectionTitle: 'What we are building',
      viewLabel: 'See Squadfire →',
      badgeAlt: 'Get it on Google Play (coming soon)',
      badgeLabel: 'Coming soon',
      artPlaceholder: 'Space for a screenshot or game art when ready',
    },
    squadfire: {
      title: 'Squadfire',
      description: 'Squadfire, a game by Little Monge Studios',
      status:
        "Squadfire is Little Monge Studios' next game, currently in development. We'll add more details here as the project moves forward.",
      screenshots: 'Screenshots',
      screenshotsSoon: "Coming soon — we'll add screenshots when they're available.",
      download: 'Download',
      badgeAlt: 'Get it on Google Play',
      badgeAltSoon: 'Get it on Google Play (coming soon)',
      badgeLabel: 'Coming soon',
    },
    contact: {
      title: 'Contact',
      description: 'Contact Little Monge Studios',
      intro: 'Questions, feedback or something to report? Write to us at',
      social: 'Social media',
      socialSoon: "Coming soon. We'll link our accounts here once they're live.",
    },
  },
  es: {
    nav: { home: 'Inicio', contact: 'Contacto', switchLabel: 'Idioma' },
    footer: {
      terms: 'Términos de Uso',
      privacy: 'Política de Privacidad',
      delete: 'Eliminar tu cuenta',
      social: 'Síguenos pronto — redes sociales en camino',
    },
    home: {
      title: 'Inicio',
      description: 'Little Monge Studios — estudio independiente de videojuegos y aplicaciones.',
      heroText: 'Estudio independiente de videojuegos y aplicaciones. Mundos pequeños, hechos con cuidado.',
      eyebrow: 'Proyectos',
      sectionTitle: 'Lo que estamos creando',
      viewLabel: 'Ver Squadfire →',
      badgeAlt: 'Disponible en Google Play (próximamente)',
      badgeLabel: 'Próximamente',
      artPlaceholder: 'Hueco para captura o arte del juego cuando esté listo',
    },
    squadfire: {
      title: 'Squadfire',
      description: 'Squadfire, un juego de Little Monge Studios',
      status:
        'Squadfire es el próximo juego de Little Monge Studios, actualmente en desarrollo. Aquí iremos añadiendo más detalles a medida que avance el proyecto.',
      screenshots: 'Capturas',
      screenshotsSoon: 'Próximamente — añadiremos capturas de pantalla cuando estén disponibles.',
      download: 'Descarga',
      badgeAlt: 'Disponible en Google Play',
      badgeAltSoon: 'Disponible en Google Play (próximamente)',
      badgeLabel: 'Próximamente',
    },
    contact: {
      title: 'Contacto',
      description: 'Contacto de Little Monge Studios',
      intro: '¿Preguntas, feedback o algo que reportar? Escríbenos a',
      social: 'Redes sociales',
      socialSoon: 'Próximamente. Aquí enlazaremos nuestras cuentas cuando estén activas.',
    },
  },
};
