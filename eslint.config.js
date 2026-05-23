import {createConfig, createTypeScriptImportResolver} from "@miskamyasa/eslint-config"

/** @type {ReturnType<typeof createConfig>} */
const config = createConfig(
  {
    tsconfigRootDir: import.meta.dirname,
    ignores: ["out/**", "dist/**", "build/**"],
  },
  {
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          project: ["./tsconfig.web.json", "./tsconfig.node.json"],
        }),
      ],
    },
    rules: {
      "no-console": ["warn", {
        allow: ["warn", "error"],
      }],
    },
  },
)

// eslint-disable-next-line import-x/no-default-export
export default config
