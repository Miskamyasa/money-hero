import {resolve} from "node:path"

import react from "@vitejs/plugin-react"
import {defineConfig} from "electron-vite"

// eslint-disable-next-line import-x/no-default-export -- electron-vite requires default export
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [react()],
  },
})
