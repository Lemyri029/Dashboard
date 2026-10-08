import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
} from "react";
import type { Block, BlockGridPosition } from "../../types";
import { useDashboardStore } from "../../store/dashboardStore";
import { BlockNode } from "./BlockNode";

const MIN_COLUMN_WIDTH = 350;
const COLUMN_GAP = 12;

/** Высота одной строки сетки в пикселях. Меньше — точнее подгонка. */
const ROW_PX = 2;

/** Визуальный отступ между блоками по вертикали, px. */
const BLOCK_GAP_PX = 8;

type DragPayload = {
  kind: "lemo-block";
  id: string;
  parentId: string | null;
};

type BlockGridProps = {
  blocks: Block[];
  boardId?: string;
  minHeight?: number;
};

type GridItemProps = {
  block: Block;
  boardId?: string;
  position: BlockGridPosition;
  span: number;
  onSpanChange: (blockId: string, span: number) => void;
};

function readDragPayload(
  event: ReactDragEvent<HTMLElement>
): DragPayload | null {
  const raw =
    event.dataTransfer.getData("application/x-lemo-block") ||
    event.dataTransfer.getData("text/plain");

  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<DragPayload>;

    if (
      value.kind !== "lemo-block" ||
      typeof value.id !== "string" ||
      (value.parentId !== null && typeof value.parentId !== "string")
    ) {
      return null;
    }

    return {
      kind: "lemo-block",
      id: value.id,
      parentId: value.parentId ?? null,
    };
  } catch {
    return null;
  }
}

/** Сколько строк сетки занимает блоки с данной высотой (включая отступ). */
function heightToSpan(height: number): number {
  return Math.max(1, Math.ceil((height + BLOCK_GAP_PX) / ROW_PX));
}

function makeCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

function positionIsFree(
  occupied: Set<string>,
  position: BlockGridPosition,
  span: number,
  columns: number
): boolean {
  if (position.col < 0 || position.col >= columns || position.row < 0) {
    return false;
  }

  for (let row = position.row; row < position.row + span; row += 1) {
    if (occupied.has(makeCellKey(position.col, row))) {
      return false;
    }
  }

  return true;
}

function reservePosition(
  occupied: Set<string>,
  position: BlockGridPosition,
  span: number
) {
  for (let row = position.row; row < position.row + span; row += 1) {
    occupied.add(makeCellKey(position.col, row));
  }
}

function findFreePosition(
  occupied: Set<string>,
  columns: number,
  span: number,
  preferred?: BlockGridPosition
): BlockGridPosition {
  if (preferred && positionIsFree(occupied, preferred, span, columns)) {
    return preferred;
  }

  const startRow = preferred?.row ?? 0;

  for (let row = startRow; row < startRow + 10000; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const candidate = { col, row };

      if (positionIsFree(occupied, candidate, span, columns)) {
        return candidate;
      }
    }
  }

  return { col: 0, row: startRow + 10000 };
}

function resolveGridPositions(
  blocks: Block[],
  columns: number,
  spans: Record<string, number>
): Record<string, BlockGridPosition> {
  const layoutKey = String(columns);
  const occupied = new Set<string>();
  const result: Record<string, BlockGridPosition> = {};

  // Сначала размещаем блоки с сохранённой позицией, затем новые.
  const orderedBlocks = [
    ...blocks.filter((block) => block.gridLayouts?.[layoutKey] != null),
    ...blocks.filter((block) => block.gridLayouts?.[layoutKey] == null),
  ];

  for (const block of orderedBlocks) {
    const span = Math.max(1, spans[block.id] ?? 1);
    const saved = block.gridLayouts?.[layoutKey];

    const preferred = saved
      ? {
          col: Math.min(columns - 1, Math.max(0, Math.floor(saved.col))),
          row: Math.max(0, Math.floor(saved.row)),
        }
      : undefined;

    const position = findFreePosition(occupied, columns, span, preferred);

    result[block.id] = position;
    reservePosition(occupied, position, span);
  }

  return result;
}

function GridItem({
  block,
  boardId,
  position,
  span,
  onSpanChange,
}: GridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    function updateSize() {
      if (!element) return;

      const height = element.getBoundingClientRect().height;
      onSpanChange(block.id, heightToSpan(height));
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [block.id, onSpanChange]);

  return (
    <div
      ref={itemRef}
      data-dashboard-block="true"
      style={{
        gridColumn: `${position.col + 1} / span 1`,
        gridRow: `${position.row + 1} / span ${span}`,
        minWidth: 0,
        alignSelf: "start",
      }}
    >
      <BlockNode block={block} boardId={boardId} parentId={null} />
    </div>
  );
}

export function BlockGrid({
  blocks,
  boardId,
  minHeight = 600,
}: BlockGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const setBlockGridPositions = useDashboardStore(
    (state) => state.setBlockGridPositions
  );
  const moveBlock = useDashboardStore((state) => state.moveBlock);
  const [containerWidth, setContainerWidth] = useState(0);
  const [spans, setSpans] = useState<Record<string, number>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] =
    useState<BlockGridPosition | null>(null);

  const columns = Math.max(
    1,
    Math.floor(
      (containerWidth + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP)
    )
  );

  const resolvedPositions = useMemo(
    () => resolveGridPositions(blocks, columns, spans),
    [blocks, columns, spans]
  );

  // Актуальные значения для обработчиков ResizeObserver,
  // которые могут срабатывать несколько раз подряд.
  const spansRef = useRef(spans);
  const positionsRef = useRef(resolvedPositions);
  const columnsRef = useRef(columns);
  spansRef.current = spans;
  positionsRef.current = resolvedPositions;
  columnsRef.current = columns;

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function updateWidth() {
      if (!element) return;
      setContainerWidth(element.getBoundingClientRect().width);
    }

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleDragStart(event: Event) {
  const detail = (
    event as CustomEvent<{ id?: string; parentId?: string | null }>
  ).detail;

  if (typeof detail?.id === "string") {
    setActiveBlockId(detail.id);
  }
}

    function handleDragEnd() {
      setActiveBlockId(null);
      setDropPosition(null);
    }

    window.addEventListener("lemo-block-drag-start", handleDragStart);
    window.addEventListener("lemo-block-drag-end", handleDragEnd);

    return () => {
      window.removeEventListener("lemo-block-drag-start", handleDragStart);
      window.removeEventListener("lemo-block-drag-end", handleDragEnd);
    };
  }, []);

  /**
 * Вызывается, когда меняется высота блока.
 *
 * Важно:
 * раньше здесь блоки ниже автоматически сдвигались вниз/вверх.
 * Из-за этого при каждом переходе в настройки и обратно ResizeObserver
 * заново измерял высоту блоков, и нижние блоки постепенно "уползали" вниз.
 *
 * Теперь здесь мы только запоминаем высоту блока для расчёта сетки,
 * но НЕ сохраняем новые координаты из-за обычного пересчёта высоты.
 */
const handleSpanChange = useCallback(
  (blockId: string, nextSpan: number) => {
    const prevSpan = spansRef.current[blockId];

    if (prevSpan === nextSpan) {
      return;
    }

    const nextSpans = {
      ...spansRef.current,
      [blockId]: nextSpan,
    };

    spansRef.current = nextSpans;
    setSpans(nextSpans);
  },
  []
);

  // Сохраняем окончательные позиции после измерения всех блоков.
  useEffect(() => {
    if (containerWidth <= 0 || blocks.length === 0) return;

    const allBlocksMeasured = blocks.every(
      (block) => spans[block.id] != null
    );

    if (!allBlocksMeasured) return;

    const layoutKey = String(columns);

    const positionsChanged = blocks.some((block) => {
      const stored = block.gridLayouts?.[layoutKey];
      const resolved = resolvedPositions[block.id];

      return (
        !stored ||
        !resolved ||
        stored.col !== resolved.col ||
        stored.row !== resolved.row
      );
    });

    if (!positionsChanged) return;

    setBlockGridPositions(columns, resolvedPositions, boardId);
  }, [
    blocks,
    boardId,
    columns,
    containerWidth,
    resolvedPositions,
    setBlockGridPositions,
    spans,
  ]);

  function getPositionFromPointer(
    event: ReactDragEvent<HTMLDivElement>
  ): BlockGridPosition {
    const element = containerRef.current;

    if (!element) {
      return { col: 0, row: 0 };
    }

    const rect = element.getBoundingClientRect();

    const localX = Math.max(
      0,
      Math.min(rect.width - 1, event.clientX - rect.left)
    );

    const localY = Math.max(0, event.clientY - rect.top);

    const columnWidth =
      (rect.width - COLUMN_GAP * (columns - 1)) / columns;

    const col = Math.max(
      0,
      Math.min(
        columns - 1,
        Math.floor(localX / (columnWidth + COLUMN_GAP))
      )
    );

    const row = Math.max(0, Math.floor(localY / ROW_PX));

    return { col, row };
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (!activeBlockId) return;

    const next = getPositionFromPointer(event);

    // Обновляем состояние только при смене ячейки,
    // иначе каждое событие dragover перерисовывает всю сетку.
    setDropPosition((current) =>
      current && current.col === next.col && current.row === next.row
        ? current
        : next
    );
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setDropPosition(null);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const payload = readDragPayload(event);
    const requested = getPositionFromPointer(event);

    setDropPosition(null);
    setActiveBlockId(null);
    window.dispatchEvent(new CustomEvent("lemo-block-drag-end"));

    if (!payload) return;

const activeId = payload.id;

// Вложенный блок бросили на пустое место сетки → переносим на дашборд.
if (payload.parentId !== null) {
  moveBlock(activeId, null, boardId);
  setBlockGridPositions(
    columns,
    { ...resolvedPositions, [activeId]: requested },
    boardId
  );
  return;
}

const activeCurrent = resolvedPositions[activeId];

if (!activeCurrent) return;

    // Ищем блок, который находится в выбранной ячейке.
    const targetBlock = blocks.find((block) => {
      if (block.id === activeId) return false;

      const position = resolvedPositions[block.id];
      const span = Math.max(1, spans[block.id] ?? 1);

      if (!position) return false;

      return (
        position.col === requested.col &&
        requested.row >= position.row &&
        requested.row < position.row + span
      );
    });

    const nextPositions: Record<string, BlockGridPosition> = {
      ...resolvedPositions,
    };

    if (targetBlock) {
      // Бросили на блок — меняемся местами.
      const targetPosition = resolvedPositions[targetBlock.id];

      nextPositions[activeId] = { ...targetPosition };
      nextPositions[targetBlock.id] = { ...activeCurrent };
    } else {
      // Бросили на пустое место — закрепляем блок там.
      nextPositions[activeId] = {
        col: requested.col,
        row: requested.row,
      };
    }

    setBlockGridPositions(columns, nextPositions, boardId);
  }

  const markerSpan = activeBlockId
  ? Math.max(1, spans[activeBlockId] ?? 60)
  : 1;

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_PX}px`,
        columnGap: `${COLUMN_GAP}px`,
        rowGap: "0px",
        alignContent: "start",
        minHeight: `${minHeight}px`,
      }}
    >
      {blocks.map((block) => {
        const position = resolvedPositions[block.id] ?? { col: 0, row: 0 };

        return (
          <GridItem
            key={block.id}
            block={block}
            boardId={boardId}
            position={position}
            span={Math.max(1, spans[block.id] ?? 1)}
            onSpanChange={handleSpanChange}
          />
        );
      })}

      {activeBlockId && dropPosition && (
        <div
          className="pointer-events-none z-50 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-400/10 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
          style={{
            gridColumn: `${dropPosition.col + 1} / span 1`,
            gridRow: `${dropPosition.row + 1} / span ${markerSpan}`,
          }}
        />
      )}
    </div>
  );
}