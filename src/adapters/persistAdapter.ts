import type { Plugin } from "obsidian";

// Здесь будет храниться ссылка на наш плагин,
// чтобы стор (Zustand) мог сохранять/загружать данные через него
let pluginRef: Plugin | null = null;

export function setPluginRef(plugin: Plugin) {
  pluginRef = plugin;
}

// "Хранилище" в формате, который понимает Zustand,
// но вместо localStorage использует файлы данных плагина Obsidian
export const obsidianStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!pluginRef) return null;
    const data = (await pluginRef.loadData()) ?? {};
    return data[name] ? JSON.stringify(data[name]) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
  if (!pluginRef) {
    console.warn("[Matreshka] Storage unavailable: pluginRef is null");
    return;
  }

  const data = (await pluginRef.loadData()) ?? {};
  const parsedValue = JSON.parse(value);

  data[name] = parsedValue;

  console.log("[Matreshka] Saving persist data:", data[name]);

  await pluginRef.saveData(data);
},
  removeItem: async (name: string): Promise<void> => {
    if (!pluginRef) return;
    const data = (await pluginRef.loadData()) ?? {};
    delete data[name];
    await pluginRef.saveData(data);
  },
};