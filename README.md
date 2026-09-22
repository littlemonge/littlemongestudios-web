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

## Estructura

```
src/
  layouts/BaseLayout.astro   Layout compartido (header + footer)
  components/                Header.astro, Footer.astro
  data/projects.js           Lista de proyectos del estudio
  pages/
    index.astro               /
    contact.astro              /contact/
    squadfire/
      index.astro               /squadfire/
      privacy.astro             /squadfire/privacy/
      delete-account.astro      /squadfire/delete-account/
```
