# Little Monge Studios — sitio web

Sitio estático del estudio, hecho con [Astro](https://astro.build). Sin
backend: compila a HTML/CSS/JS puro en `dist/`.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Genera `dist/`, listo para desplegar en Cloudflare Pages o GitHub Pages
(comando de build: `npm run build`, carpeta de salida: `dist`).

## Añadir un proyecto nuevo

1. Añade una entrada en [`src/data/projects.js`](src/data/projects.js) —
   aparecerá automáticamente en Home y en la navegación del header/footer.
2. Si necesita página propia, crea `src/pages/<slug>/index.astro` (usa
   `src/pages/squadfire/` como referencia).
3. Si necesita Privacy Policy / Delete account (requisito de Google Play),
   añade `src/pages/<slug>/privacy.astro` y `src/pages/<slug>/delete-account.astro`,
   y marca `legalPages: true` en su entrada de `projects.js` para que
   aparezcan en el footer.

## Sonar (minijuego diario, `/sonar/`)

Juego estático: sin servidor ni base de datos, el progreso vive en `localStorage`
(`sonar:v1`). La página es `src/views/Sonar.astro` (rutas `/sonar/` y `/es/sonar/`);
el juego en sí son archivos estáticos en `public/sonar/`:

- `engine.js`: generador diario con semilla. **No tocar semilla ni parámetros**: cambiaría todos los puzles.
- `sonar.js`: reglas, racha/escudos, estadísticas, texto para compartir e interfaz.
- `sonar.css`, `og.png` (imagen Open Graph).

La fecha de lanzamiento (puzle #1) está en `LAUNCH` de `public/sonar/sonar.js`.
Antes de esa fecha la página muestra una cuenta atrás. `/sonar/?debug=1` activa
herramientas de prueba (otra fecha, reiniciar día, mostrar figura) con un guardado
aparte (`sonar:v1:debug`). Tests: `npm test`.

## Estructura

```
src/
  layouts/BaseLayout.astro   Layout compartido (header + footer)
  components/                Header.astro, Footer.astro
  data/projects.js           Lista de proyectos del estudio
  pages/
    index.astro               /
    contact.astro              /contact/
    sonar/index.astro           /sonar/
    squadfire/
      index.astro               /squadfire/
      privacy.astro             /squadfire/privacy/
      delete-account.astro      /squadfire/delete-account/
```
