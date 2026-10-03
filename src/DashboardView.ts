import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import App from "./App";
import { useDashboardStore } from "./store/dashboardStore";

export const VIEW_TYPE_DASHBOARD = "nexus-dashboard-view";

export class DashboardView extends ItemView {
  root: Root | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText() {
    return "Matreshka";
  }

  getIcon() {
    return "layout-dashboard";
  }

  async onOpen() {
    // Передаём в стор ссылку на app и сразу строим дерево файлов
    useDashboardStore.getState().setApp(this.app);
    useDashboardStore.getState().refreshVault();

    // Подписка на изменения файлов — дерево будет обновляться само
    this.registerEvent(this.app.vault.on("create", () => useDashboardStore.getState().refreshVault()));
    this.registerEvent(this.app.vault.on("delete", () => useDashboardStore.getState().refreshVault()));
    this.registerEvent(this.app.vault.on("rename", () => useDashboardStore.getState().refreshVault()));

    this.root = createRoot(this.containerEl.children[1]);
    this.containerEl.addClass("nexus-dashboard-root");
    this.root.render(createElement(App));
  }

  async onClose() {
    this.root?.unmount();
  }
}