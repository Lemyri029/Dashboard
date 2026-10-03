import { Plugin } from "obsidian";
import { DashboardView, VIEW_TYPE_DASHBOARD } from "./DashboardView";
import { setPluginRef } from "./adapters/persistAdapter";
import { useDashboardStore } from "./store/dashboardStore";  // ← ЭТУ СТРОКУ НУЖНО ДОБАВИТЬ

export default class NexusDashboardPlugin extends Plugin {
  async onload() {
    // 1. Сначала передаём ссылку на плагин
    setPluginRef(this);

    // 2. Вручную загружаем сохранённое состояние из data.json
    await (useDashboardStore as any).persist.rehydrate();

    // 3. Только потом передаём app в стор
    useDashboardStore.getState().setApp(this.app);

    console.log(
      "[Matreshka] Hydrated background:",
      useDashboardStore.getState().background
    );

    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf)
    );

    this.addRibbonIcon("layout-dashboard", "Открыть Matreshka", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-nexus-dashboard",
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