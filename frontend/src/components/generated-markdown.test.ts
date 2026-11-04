import {expect,it} from "vitest";
import {generatedMarkdown} from "./generated-markdown";
it("repairs escaped prose while retaining code escapes",()=>{expect(generatedMarkdown('Заголовок\\n\\nСодержание')).toBe('Заголовок\n\nСодержание');expect(generatedMarkdown('Текст\\n`value\\n`\n```js\nconst x="\\n";\n```')).toBe('Текст\n`value\\n`\n```js\nconst x="\\n";\n```');});
