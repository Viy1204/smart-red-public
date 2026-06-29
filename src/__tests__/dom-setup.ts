import { Window } from "happy-dom";

const window = new Window();
const document = window.document;

(globalThis as any).window = window;
(globalThis as any).document = document;
(globalThis as any).HTMLElement = window.HTMLElement;
(globalThis as any).HTMLDivElement = window.HTMLDivElement;
(globalThis as any).HTMLStyleElement = window.HTMLStyleElement;
(globalThis as any).ShadowRoot = window.ShadowRoot;
(globalThis as any).getComputedStyle = window.getComputedStyle.bind(window);
(globalThis as any).requestAnimationFrame = (fn: FrameRequestCallback) => setTimeout(fn, 16);
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

(window.HTMLElement.prototype as any).empty = function () {
  while (this.firstChild) {
    this.removeChild(this.firstChild);
  }
};
(window.HTMLElement.prototype as any).addClass = function (...cls: string[]) {
  this.classList.add(...cls);
};
(window.HTMLElement.prototype as any).removeClass = function (...cls: string[]) {
  this.classList.remove(...cls);
};
(window.HTMLElement.prototype as any).toggleClass = function (cls: string, force?: boolean) {
  this.classList.toggle(cls, force);
};
(window.HTMLElement.prototype as any).createEl = function (tag: string, attrs?: any) {
  const el = document.createElement(tag);
  if (attrs?.cls) el.className = attrs.cls;
  if (attrs?.text) el.textContent = attrs.text;
  if (attrs?.attr) {
    for (const [k, v] of Object.entries(attrs.attr)) {
      el.setAttribute(k, String(v));
    }
  }
  this.appendChild(el);
  return el;
};
(window.HTMLElement.prototype as any).setAttribute = window.HTMLElement.prototype.setAttribute;

// Mock Obsidian's setCssStyles / setCssProps helpers.
(window.HTMLElement.prototype as any).setCssStyles = function (styles: Record<string, string>) {
  for (const [key, value] of Object.entries(styles)) {
    (this.style as any)[key] = value;
  }
};
(window.HTMLElement.prototype as any).setCssProps = function (props: Record<string, string>) {
  for (const [key, value] of Object.entries(props)) {
    this.style.setProperty(key, value);
  }
};

// Mock constructable stylesheets for Shadow DOM templates.
class MockCSSStyleSheet {
  private css = '';
  replaceSync(text: string) {
    this.css = text;
  }
  toString() {
    return this.css;
  }
}
(globalThis as any).CSSStyleSheet = MockCSSStyleSheet;
(globalThis as any).CSSStyleSheet = MockCSSStyleSheet;

const originalAttachShadow = (window.HTMLElement.prototype as any).attachShadow;
(window.HTMLElement.prototype as any).attachShadow = function (init: ShadowRootInit) {
  const shadow = originalAttachShadow.call(this, init);
  (shadow as any).adoptedStyleSheets = [];
  Object.defineProperty(shadow, 'adoptedStyleSheets', {
    set(sheets: unknown[]) {
      (shadow as any).__adoptedStyleSheets = sheets;
      const style = document.createElement('style');
      style.textContent = sheets
        .map((s: any) => (typeof s === 'string' ? s : s.toString()))
        .join('\n');
      if (shadow.firstChild) {
        shadow.insertBefore(style, shadow.firstChild);
      } else {
        shadow.appendChild(style);
      }
    },
    get() {
      return (shadow as any).__adoptedStyleSheets || [];
    },
  });
  return shadow;
};