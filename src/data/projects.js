// Añadir un proyecto nuevo aquí lo hace aparecer en Home.
// Si además necesita su propia página de detalle, crea la carpeta
// src/pages/<slug>/ (inglés) y src/pages/es/<slug>/ (español).
export const projects = [
  {
    slug: 'squadfire',
    name: 'Squadfire',
    tagline: {
      en: 'Coming soon to Google Play',
      es: 'Próximamente en Google Play',
    },
    blurb: {
      en: 'Check in every day to build your streak, reveal a new illustration each month, and keep it going with friends and squads.',
      es: 'Haz check-in cada día para construir tu racha, descubrir una ilustración nueva cada mes y mantenerla con amigos y escuadrones.',
    },
    status: 'in-development', // 'in-development' | 'published'
    storeUrl: null, // placeholder hasta que la ficha de Play Store esté publicada
    legalPages: true, // tiene /terms/, /privacy/ y /delete-account/ propias, se listan en el footer
  },
];
