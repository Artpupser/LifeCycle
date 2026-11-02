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
    files: ["src/features/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "NewExpression[callee.name='Date']", message: "Use the centralized date/time system in @/lib/dates." },
        { selector: "NewExpression[callee.name='Notification']", message: "Use the centralized feedback system." },
        { selector: "CallExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']", message: "Use @/lib/dates and account preferences." },
        { selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]", message: "Use @/lib/dates and account preferences." },
        { selector: "CallExpression[callee.name=/^(alert|confirm|prompt)$/]", message: "Use @/lib/feedback." },
        { selector: "CallExpression[callee.object.name=/^(window|globalThis)$/][callee.property.name=/^(alert|confirm|prompt)$/]", message: "Use @/lib/feedback." },
        { selector: "JSXOpeningElement[name.name='Input'] JSXAttribute[name.name='type'][value.value='search']", message: "Use FilterSearch for the unified search and filter interface." },
      ],
    },
  },
);
