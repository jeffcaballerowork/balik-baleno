import cloudflare from "@astrojs/cloudflare"

import react from "@astrojs/react"

import tailwindcss from "@tailwindcss/vite"

import { defineConfig } from "astro/config"

export default defineConfig({
  output: "static",

  adapter: cloudflare({
    imageService: "passthrough",
  }),

  integrations: [react()],

  session: false,

  trailingSlash: "never",

  vite: {
    plugins: [tailwindcss()],
  },
})
