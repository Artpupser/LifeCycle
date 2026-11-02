import js from "@eslint/js";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": hooks, "react-refresh": refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/systems/icons/**", "src/systems/sounds/**", "src/components/markdown.tsx", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [
        { name: "lucide-react", message: "Use the centralized Iconify catalog." },
        { name: "@iconify/react", message: "Use AppIcon or the shared icon components." },
        { name: "@iconify/react/offline", message: "Use AppIcon or the shared icon components." },
        { name: "@foleyjs/core", message: "Use the centralized sound system." },
        { name: "@foleyjs/react", message: "Use the centralized sound provider." },
        { name: "react-markdown", message: "Use the shared Markdown component." },
        { name: "remark-gfm", message: "Configure Markdown in one place." },
      ] }],
    },
  },
  {
    files: ["src/features/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "NewExpression[callee.name='Date']", message: "Use @/lib/dates." },
        { selector: "NewExpression[callee.name='Notification']", message: "Use @/lib/feedback." },
        { selector: "CallExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']", message: "Use @/lib/dates." },
        { selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]", message: "Use @/lib/dates." },
        { selector: "CallExpression[callee.name=/^(alert|confirm|prompt)$/]", message: "Use @/lib/feedback." },
        { selector: "CallExpression[callee.object.name=/^(window|globalThis)$/][callee.property.name=/^(alert|confirm|prompt)$/]", message: "Use @/lib/feedback." },
        { selector: "JSXOpeningElement[name.name=/^(Input|input)$/] JSXAttribute[name.name='type'][value.value='search']", message: "Use FilterSearch." },
        { selector: "JSXOpeningElement[name.name='img']", message: "Use UserImage from the centralized media system." },
        { selector: "JSXOpeningElement[name.name='Input'] JSXAttribute[name.name='type'][value.value='tel']", message: "Use PhoneInput." },
      ],
    },
  },
);
