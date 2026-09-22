import { defineConfig } from 'astro/config';

// Deploy target: custom domain root (works as-is on Cloudflare Pages;
// on GitHub Pages without a custom domain you'd need to set `base`).
export default defineConfig({
  site: 'https://littlemongestudios.com',
  trailingSlash: 'always',
});
