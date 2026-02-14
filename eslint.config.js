import antfu from "@antfu/eslint-config"

export default antfu({
  formatters: true,
  typescript: true,
  react: true,
  stylistic: {
    quotes: "double",
  },
  ignores: [
    "AGENTS.md",
  ],
  rules: {
    "no-console": "off",
    "node/prefer-global/process": "off",
  },
})
