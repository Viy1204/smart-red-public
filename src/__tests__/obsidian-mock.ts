export class ItemView {
  containerEl: HTMLElement;
  app: any;
  constructor(leaf: any) {
    this.app = leaf?.app || {};
    this.containerEl = document.createElement('div');
    const child = document.createElement('div');
    this.containerEl.appendChild(document.createElement('div'));
    this.containerEl.appendChild(child);
  }
  registeredEvents: any[] = [];
  registerEvent(ref: any): void {
    this.registeredEvents.push(ref);
  }
  getViewType(): string { return ''; }
  getDisplayText(): string { return ''; }
  getIcon(): string { return ''; }
  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class WorkspaceLeaf {
  app: any;
  constructor(app?: any) {
    this.app = app || {};
  }
}

export class TFile {
  path: string;
  name: string;
  extension: string;
  constructor(path: string, name: string, extension: string) {
    this.path = path;
    this.name = name;
    this.extension = extension;
  }
}

export function debounce(fn: () => void, ms: number, immediate?: boolean) {
  let timeout: any;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, ms);
  };
}

export class Plugin {
  app: any;
  settings: any;
  constructor(app?: any) {
    this.app = app || {};
  }
  async loadData(): Promise<any> { return {}; }
  async saveData(data: any): Promise<void> {}
  registerView(type: string, fn: any): void {}
  addCommand(cmd: any): void {}
  addRibbonIcon(icon: string, title: string, fn: () => void): void {}
  addSettingTab(tab: any): void {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  display(): void {}
}

export class Notice {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export class Modal {
  app: any;
  contentEl: HTMLElement;
  titleEl: HTMLElement;
  modalEl: HTMLElement;
  constructor(app: any) {
    this.app = app;
    this.contentEl = document.createElement('div');
    this.titleEl = document.createElement('div');
    this.modalEl = document.createElement('div');
    this.modalEl.appendChild(this.titleEl);
    this.modalEl.appendChild(this.contentEl);
  }
  open(): void {
    this.onOpen();
  }
  close(): void {
    this.onClose();
  }
  onOpen(): void {}
  onClose(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }
  setName(name: string): Setting {
    this.settingEl.setAttribute('aria-label', name);
    return this;
  }
  setDesc(desc: string): Setting { return this; }
  setHeading(): Setting { return this; }
  addDropdown(cb: any): Setting {
    const select = document.createElement('select');
    const api = {
      selectEl: select,
      addOption: (v: string, l: string) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = l;
        select.appendChild(opt);
        return api;
      },
      setValue: (v: string) => {
        select.value = v;
        return api;
      },
      onChange: (fn: any) => {
        select.addEventListener('change', () => fn(select.value));
        return api;
      },
    };
    cb(api);
    this.settingEl.appendChild(select);
    return this;
  }
  addSlider(cb: any): Setting {
    const input = document.createElement('input');
    input.type = 'range';
    const api = {
      setLimits: (min: number, max: number, step: number) => {
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        return api;
      },
      setValue: (v: number) => { input.value = String(v); return api; },
      setDynamicTooltip: () => api,
      onChange: (fn: any) => {
        input.addEventListener('input', () => fn(parseInt(input.value, 10)));
        return api;
      },
    };
    cb(api);
    this.settingEl.appendChild(input);
    return this;
  }
  addText(cb: any): Setting {
    const input = document.createElement('input');
    input.type = 'text';
    const api = {
      inputEl: input,
      getValue: () => input.value,
      setPlaceholder: (value: string) => { input.placeholder = value; return api; },
      setValue: (v: string) => {
        input.value = v;
        return api;
      },
      onChange: (fn: any) => {
        input.addEventListener('input', () => fn(input.value));
        return api;
      },
    };
    cb(api);
    this.settingEl.appendChild(input);
    return this;
  }
  addColorPicker(cb: any): Setting {
    const input = document.createElement('input');
    input.type = 'color';
    const api = {
      setValue: (value: string) => { input.value = value; return api; },
      onChange: (fn: any) => {
        input.addEventListener('input', () => fn(input.value));
        return api;
      },
    };
    cb(api);
    this.settingEl.appendChild(input);
    return this;
  }
  addExtraButton(cb: any): Setting {
    const button = document.createElement('button');
    const api = {
      setIcon: () => api,
      setTooltip: (value: string) => { button.title = value; return api; },
      onClick: (fn: any) => { button.addEventListener('click', fn); return api; },
    };
    cb(api);
    this.settingEl.appendChild(button);
    return this;
  }
  addToggle(cb: any): Setting {
    const input = document.createElement('input');
    input.type = 'checkbox';
    const api = {
      setValue: (v: boolean) => {
        input.checked = v;
        return api;
      },
      onChange: (fn: any) => {
        input.addEventListener('change', () => fn(input.checked));
        return api;
      },
    };
    cb(api);
    this.settingEl.appendChild(input);
    return this;
  }
}

export function sanitizeHTMLToDom(html: string): DocumentFragment {
  const range = document.createRange();
  return range.createContextualFragment(html);
}

export class App {
  vault: any;
  workspace: any;
  constructor() {
    this.vault = {
      on: () => {},
      off: () => {},
      read: async () => '',
    };
    this.workspace = {
      getActiveFile: () => null,
      getLeavesOfType: () => [],
      revealLeaf: () => {},
      getRightLeaf: () => null,
      on: () => {},
      off: () => {},
    };
  }
}
