import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

describe("user-controlled text", () => {
  test("renders a markup payload as text", () => {
    const payload = `<img src=x onerror=alert(1)><script>alert("xss")</script>`;
    const html = renderToStaticMarkup(createElement("h1", null, payload));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("onerror=alert(1)");
  });
});
