import cloudflare from "@astrojs/cloudflare"

import react from "@astrojs/react"

import { createRequire } from "node:module"

import { defineConfig } from "astro/config"

const require = createRequire(import.meta.url)
const tailwindcss: typeof import("@tailwindcss/vite").default = require("@tailwindcss/vite").default

export default defineConfig({
  output: "static",

  devToolbar: {
    enabled: false,
  },

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
