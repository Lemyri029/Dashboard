import {
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowLeft, LayoutList } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import { BlockGrid } from "../components/blocks/BlockGrid";
import { AddBlockContextMenu } from "../components/blocks/AddBlockMenu";

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

export default function BoardPage({ boardId }: { boardId: string }) {
  const board = useDashboardStore((s) => s.boards[boardId]);
  const goBack = useDashboardStore((s) => s.goBack);
  const addBlock = useDashboardStore((s) => s.addBlock);
  const renameBoard = useDashboardStore((s) => s.renameBoard);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(board?.title ?? "");

  const [contextMenu, setContextMenu] =
    useState<ContextMenuState>({
      open: false,
      x: 0,
      y: 0,
    });

  if (!board) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <p className="mb-3">Страница не найдена</p>
        <button
          onClick={goBack}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm transition hover:border-cyan-400/30 hover:text-slate-200"
        >
          Назад
        </button>
      </div>
    );
  }

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
      {/* Кнопка «Назад» — в левом верхнем углу */}
      <div className="absolute left-4 top-4 z-30">
        <button
          onClick={goBack}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan-400/30 hover:text-slate-200"
          title="Вернуться к списку"
        >
          <ArrowLeft size={12} />
          Назад
        </button>
      </div>

      <div className="min-h-full w-full px-4 pt-14 pb-4">
        {/* Заголовок страницы — по центру, без лишних отступов сверху */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/20"
            title={`Список · ${board.blocks.length} блоков`}
          >
            <LayoutList size={14} className="text-cyan-300" />
          </div>

          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              onBlur={() => {
                renameBoard(
                  boardId,
                  title || board.title
                );
                setEditing(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  (
                    event.target as HTMLInputElement
                  ).blur();
                }
              }}
              className="rounded bg-black/30 px-2 py-0.5 text-base font-bold tracking-tight text-slate-100 focus:outline-none"
            />
          ) : (
            <h1
              onDoubleClick={() => setEditing(true)}
              className="cursor-text truncate text-base font-bold tracking-tight text-slate-200/90"
              title="Двойной клик — переименовать список"
            >
              {board.title}
            </h1>
          )}
        </div>

        {/* Адаптивная сетка блоков */}
{board.blocks.length > 0 ? (
  <BlockGrid
    blocks={board.blocks}
    boardId={boardId}
    minHeight={600}
  />
) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-500">
            <p className="mb-2 text-sm">Список пуст</p>

            <p className="text-[11px] text-slate-600">
              Нажмите правой кнопкой мыши на свободном месте,
              чтобы добавить первый блок.
            </p>
          </div>
        )}
      </div>

      {/* Контекстное меню добавления блока */}
      <AddBlockContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        onAdd={(type) =>
          addBlock(null, type, undefined, boardId)
        }
        onClose={closeContextMenu}
      />
    </div>
  );
} 