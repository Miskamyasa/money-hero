import {createConfig} from "@miskamyasa/eslint-config"
import {createTypeScriptImportResolver} from "eslint-import-resolver-typescript"

/** @type {ReturnType<typeof createConfig>} */
const config = createConfig(
  {
    tsconfigRootDir: import.meta.dirname,
    ignores: ["out/**", "dist/**", ".yarn/**", "build/**"],
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
