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
  {
    files:["src/**/*.{ts,tsx}"],
    ignores:["**/*.test.ts"],
    plugins:{"central-systems":{rules:{imports:{
      meta:{type:"problem",schema:[]},
      create(context){
        const check=node=>{
          const name=node.source?.value;
          if(typeof name!=="string")return;
          const owner=name==="motion"||name.startsWith("motion/")||name==="framer-motion"?"animations":name==="tsparticles"||name.startsWith("@tsparticles/")?"effects":name==="date-holidays"||name.startsWith("date-holidays/")?"holidays":null;
          if(owner&&!context.filename.replaceAll("\\","/").includes(`/src/systems/${owner}/`))context.report({node,message:`Use the centralized ${owner} system.`});
        };
        return {ImportDeclaration:check,ImportExpression:check};
      },
    }}}},
    rules:{"central-systems/imports":"error"},
  },
);
