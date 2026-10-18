import cloudflare from "@astrojs/cloudflare"

import react from "@astrojs/react"

import tailwindcss from "@tailwindcss/vite"

import { defineConfig } from "astro/config"

import icon from "astro-icon"

export default defineConfig({
  output: "static",

  devToolbar: {
    enabled: false,
  },

  adapter: cloudflare({
    imageService: "passthrough",
  }),

  integrations: [react(), icon()],

  session: false,

  trailingSlash: "never",

  vite: {
    optimizeDeps: {
      exclude: ['astro-icon', 'zod'],
    },
    plugins: [tailwindcss()],
  },
})
