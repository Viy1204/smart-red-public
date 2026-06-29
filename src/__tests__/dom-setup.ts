import { Window } from "happy-dom";

const window = new Window();
const document = window.document;

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