import { Plugin } from "obsidian";
import { DashboardView, VIEW_TYPE_DASHBOARD } from "./DashboardView";
import { setPluginRef } from "./adapters/persistAdapter";
import { useDashboardStore } from "./store/dashboardStore";  // ← ЭТУ СТРОКУ НУЖНО ДОБАВИТЬ

export default class LemoPlugin extends Plugin {
  async onload() {
  // 1. Сначала передаём ссылку на плагин
  setPluginRef(this);

  // 2. Загружаем сохранённое состояние
  await (useDashboardStore as any).persist.rehydrate();

  // 3. Передаём app в store
  const state = useDashboardStore.getState();
  state.setApp(this.app);

  // 4. ВАЖНО: дожидаемся загрузки кастомных тем ДО открытия дашборда
  await state.reloadThemes();

  console.log("[Lemo] Hydrated background:", state.background);

  this.registerView(
    VIEW_TYPE_DASHBOARD,
    (leaf) => new DashboardView(leaf)
  );

  this.addRibbonIcon("layout-dashboard", "Открыть Lemo", () => {
    this.activateView();
  });

  this.addCommand({
    id: "open-lemo",
    name: "Открыть дашборд",
    callback: () => this.activateView(),
  });
}

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  onunload() {}
}