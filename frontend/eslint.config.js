import js from "@eslint/js";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public/mockServiceWorker.js"] },
  js.configs.recommended,
  {files:["public/*sw.js"],languageOptions:{globals:globals.serviceworker}},
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
    ignores:["**/*.test.ts","**/*.test.tsx"],
    plugins:{"central-systems":{rules:{imports:{
      meta:{type:"problem",schema:[]},
      create(context){
        const check=node=>{
          const name=node.source?.value;
          if(typeof name!=="string")return;
          const owner=name==="motion"||name.startsWith("motion/")||name==="framer-motion"?"animations":name==="tsparticles"||name.startsWith("@tsparticles/")?"effects":name==="date-holidays"||name.startsWith("date-holidays/")?"holidays":null;
          const filename=context.filename.replaceAll("\\","/");
          const allowed=name==="luxon"?filename.endsWith("/src/lib/dates.ts")
            :name==="i18next"||name==="react-i18next"?filename.includes("/src/systems/i18n/")
            :name==="react-hook-form"||name.startsWith("@hookform/")||name==="zod"?filename.includes("/src/systems/forms/")
            :name.startsWith("@dnd-kit/")?filename.includes("/src/systems/animations/")
            :name==="@tanstack/react-query"?filename.includes("/src/systems/loading/")||filename.endsWith("/src/hooks/use-resource.ts")||filename.endsWith("/src/hooks/use-action.ts")||filename.endsWith("/src/main.tsx")
            :name==="@tanstack/react-virtual"?filename.endsWith("/src/components/ui/virtual-grid.tsx")
            :name.startsWith("@radix-ui/react-")&&name!=="@radix-ui/react-slot"?filename.includes("/src/systems/actions/")||filename.endsWith("/src/components/dialog.tsx")
            :true;
          if(!allowed)context.report({node,message:"Use the existing centralized adapter for this library."});
          if(owner&&!context.filename.replaceAll("\\","/").includes(`/src/systems/${owner}/`))context.report({node,message:`Use the centralized ${owner} system.`});
        };
        return {ImportDeclaration:check,ImportExpression:check,JSXOpeningElement(node){
          if(["input","select","textarea","datalist"].includes(node.name?.name)&&!context.filename.replaceAll("\\","/").includes("/src/components/ui/"))context.report({node,message:"Use the shared Input, Textarea or ChoiceField controls."});
        }};
      },
    }}}},
    rules:{"central-systems/imports":"error"},
  },
);
