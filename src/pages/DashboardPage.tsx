import {
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useDashboardStore } from "../store/dashboardStore";
import { AddBlockContextMenu } from "../components/blocks/AddBlockMenu";
import { BlockGrid } from "../components/blocks/BlockGrid";
import { t } from "../i18n";

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

export default function DashboardPage() {
  const blocks = useDashboardStore((state) => state.blocks);
  const addBlock = useDashboardStore((state) => state.addBlock);
  const language = useDashboardStore((state) => state.language);

  const [contextMenu, setContextMenu] =
    useState<ContextMenuState>({
      open: false,
      x: 0,
      y: 0,
    });

  function handleWorkspaceContextMenu(
    event: ReactMouseEvent<HTMLDivElement>
  ) {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest('[data-dashboard-block="true"]')
    ) {
      setContextMenu((current) => ({
        ...current,
        open: false,
      }));

      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function closeContextMenu() {
    setContextMenu((current) => ({
      ...current,
      open: false,
    }));
  }

  return (
    <div
      className="relative h-full min-h-full w-full"
      onContextMenu={handleWorkspaceContextMenu}
    >
      <div className="min-h-full w-full px-4 py-4">
        {blocks.length > 0 ? (
          <BlockGrid
            blocks={blocks}
            minHeight={700}
          />
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
            <p className="mb-2 text-sm">
              {t("dashboard.empty.title", language)}
            </p>

            <p className="text-[11px] text-slate-600">
              {t("dashboard.empty.subtitle", language)}
            </p>
          </div>
        )}
      </div>

      <AddBlockContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        onAdd={(type) => addBlock(null, type)}
        onClose={closeContextMenu}
      />
    </div>
  );
}