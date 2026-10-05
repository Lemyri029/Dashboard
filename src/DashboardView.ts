import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import App from "./App";
import { useDashboardStore } from "./store/dashboardStore";

export const VIEW_TYPE_DASHBOARD = "Lemo-view";

export class DashboardView extends ItemView {
  root: Root | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText() {
    return "Lemo";
  }

  getIcon() {
    return "layout-dashboard";
  }

  async onOpen() {
  const state = useDashboardStore.getState();
  const contentEl = this.containerEl.children[1] as HTMLElement;

  this.containerEl.addClass("Lemo-root");

  // Скрываем контейнер до первого render, чтобы не было заметного перехода
  contentEl.style.opacity = "0";

  state.refreshVault();

  // Подписка на изменения файлов — дерево будет обновляться само
  this.registerEvent(this.app.vault.on("create", () => useDashboardStore.getState().refreshVault()));
  this.registerEvent(this.app.vault.on("delete", () => useDashboardStore.getState().refreshVault()));
  this.registerEvent(this.app.vault.on("rename", () => useDashboardStore.getState().refreshVault()));

  this.root = createRoot(contentEl);
  this.root.render(createElement(App));

  requestAnimationFrame(() => {
    contentEl.style.transition = "opacity 120ms ease";
    contentEl.style.opacity = "1";
  });
}
}