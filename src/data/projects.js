// Añadir un proyecto nuevo aquí lo hace aparecer en Home.
// Si además necesita su propia página de detalle, crea la carpeta
// src/pages/<slug>/ (ver src/pages/squadfire/ como referencia).
export const projects = [
  {
    slug: 'squadfire',
    name: 'Squadfire',
    tagline: 'Próximamente en Google Play',
    status: 'in-development', // 'in-development' | 'published'
    storeUrl: null, // placeholder hasta que la ficha de Play Store esté publicada
    legalPages: true, // tiene /privacy/ y /delete-account/ propias, se listan en el footer
  },
];
