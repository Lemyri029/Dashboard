import {
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useDashboardStore } from "../store/dashboardStore";
import { BlockNode } from "../components/blocks/BlockNode";
import { AddBlockContextMenu } from "../components/blocks/AddBlockMenu";

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

export default function DashboardPage() {
  const blocks = useDashboardStore((s) => s.blocks);
  const addBlock = useDashboardStore((s) => s.addBlock);

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

    /*
     * Если ПКМ нажата внутри существующего блока,
     * наше меню добавления не открываем.
     */
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
      <div className="w-full px-4 py-4">
        {blocks.length > 0 ? (
          <div
            className="gap-3 space-y-3 [&>*]:break-inside-avoid"
            style={{ columnWidth: "350px" }}
          >
            {blocks.map((block) => (
              <div
                key={block.id}
                data-dashboard-block="true"
                className="mb-3"
              >
                <BlockNode block={block} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
            <p className="mb-2 text-sm">Дашборд пуст</p>

            <p className="text-[11px] text-slate-600">
              Нажмите правой кнопкой мыши на свободном месте,
              чтобы добавить блок.
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
