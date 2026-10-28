import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const render = (value: string) => renderToStaticMarkup(createElement(Markdown, { value }));

describe("saved Markdown rendering", () => {
  it("AI output cannot load authenticated or external images", () => {
    const html = renderToStaticMarkup(createElement(Markdown, { value: "![private](/api/media/123e4567-e89b-12d3-a456-426614174000) ![external](https://example.com/image.png)", allowImages: false }));
    expect(html).not.toContain("<img");
    expect(html).not.toContain("src=");
  });
  it("renders GFM tables, task lists and formatting", () => {
    const html = render("| План | Статус |\n| --- | --- |\n| **Работа** | ~~позже~~ |\n\n- [x] Готово\n- [ ] Осталось");
    expect(html).toContain("<table>");
    expect(html).toContain("<strong>Работа</strong>");
    expect(html).toContain("<del>позже</del>");
    expect(html).toMatch(/type="checkbox"[^>]*checked=""/);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
  });

  it("drops executable HTML and rejects unsafe link destinations", () => {
    const html = render('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[скрипт](javascript:alert%281%29) [данные](data:text/html;base64,PHNjcmlwdD4=) [внешний путь](//attacker.example/path) [ссылка](https://example.org/source)');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text");
    expect(html).not.toContain('href="//');
    expect(html).toContain('href="https://example.org/source"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("allows authenticated media while blocking external and embedded images", () => {
    const privateUrl = "/api/media/123e4567-e89b-12d3-a456-426614174000";
    const html = render(`![личное](${privateUrl})\n\n![внешнее](https://attacker.example/pixel.png)\n\n![встроенное](data:image/png;base64,aGVsbG8=)\n\n![путь](//attacker.example/pixel.png)`);
    expect(html).toContain(`src="${privateUrl}"`);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).not.toContain('src="https:');
    expect(html).not.toContain('src="data:');
    expect(html).toContain("внешнее");
  });
});
