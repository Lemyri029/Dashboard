import { v4 as uuid } from "uuid";
import type { Block, FlowchartDoc, HostlyDoc, VaultFile } from "../types";

const id = () => uuid();

// -------------------- Flowchart docs --------------------
export const flowchartDocs: Record<string, FlowchartDoc> = {
  "flow-release": {
    id: "flow-release",
    name: "Release pipeline.flow",
    nodes: [
      { id: "n1", position: { x: 0, y: 80 }, data: { label: "Идея / Тикет" } },
      { id: "n2", position: { x: 240, y: 80 }, data: { label: "Разработка" } },
      { id: "n3", position: { x: 480, y: 0 }, data: { label: "Code Review" } },
      { id: "n4", position: { x: 480, y: 160 }, data: { label: "QA тестирование" } },
      { id: "n5", position: { x: 720, y: 80 }, data: { label: "Стейджинг" } },
      { id: "n6", position: { x: 960, y: 80 }, data: { label: "Продакшн 🚀" } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n2", target: "n4" },
      { id: "e4", source: "n3", target: "n5" },
      { id: "e5", source: "n4", target: "n5" },
      { id: "e6", source: "n5", target: "n6", animated: true, label: "approve" },
    ],
  },
  "flow-vault": {
    id: "flow-vault",
    name: "Vault sync.flow",
    nodes: [
      { id: "a1", position: { x: 0, y: 0 }, data: { label: "Obsidian Vault" } },
      { id: "a2", position: { x: 260, y: 0 }, data: { label: "Local REST API" } },
      { id: "a3", position: { x: 520, y: -80 }, data: { label: "Dashboard" } },
      { id: "a4", position: { x: 520, y: 80 }, data: { label: "Mobile sync" } },
    ],
    edges: [
      { id: "f1", source: "a1", target: "a2", animated: true },
      { id: "f2", source: "a2", target: "a3" },
      { id: "f3", source: "a2", target: "a4" },
    ],
  },
};

// -------------------- Hostly docs --------------------
export const hostlyDocs: Record<string, HostlyDoc> = {
  "hostly-home": {
    id: "hostly-home",
    name: "home-lab.hostly",
    environment: "Домашняя лаборатория",
    services: [
      {
        id: id(),
        name: "Obsidian Sync",
        host: "127.0.0.1",
        port: 27123,
        protocol: "https",
        status: "online",
        tags: ["obsidian", "rest-api"],
        notes: "Local REST API plugin, ключ хранится в .env",
      },
      {
        id: id(),
        name: "NAS Files",
        host: "10.0.0.15",
        port: 5000,
        protocol: "http",
        status: "online",
        tags: ["storage", "smb"],
      },
      {
        id: id(),
        name: "Dev Server",
        host: "dev.local",
        port: 5173,
        protocol: "http",
        status: "degraded",
        tags: ["vite", "dev"],
        notes: "Иногда падает при HMR на больших файлах",
      },
      {
        id: id(),
        name: "Backup Node",
        host: "192.168.1.40",
        port: 22,
        protocol: "ssh",
        status: "offline",
        tags: ["backup", "cron"],
      },
    ],
  },
};

// -------------------- Vault file tree --------------------
export const vaultTree: VaultFile[] = [
  {
    id: id(),
    name: "00 Инбокс",
    kind: "folder",
    path: "C:/Vault/00 Инбокс",
    children: [
      {
        id: id(),
        name: "Быстрые заметки.md",
        kind: "markdown",
        path: "C:/Vault/00 Инбокс/Быстрые заметки.md",
        size: 2140,
        modified: "2026-02-11",
        content: `# Быстрые заметки

Идеи, которые нужно раскидать по разделам.

- [ ] Разобрать [[Архитектура дашборда]]
- [ ] Связать #project/dashboard с [[Roadmap]]
- [x] Настроить Local REST API

> Внутренние ссылки в стиле Obsidian ([[wikilinks]]) поддерживаются нативно.

## Теги
#obsidian #dashboard #techno-minimal
`,
      },
    ],
  },
  {
    id: id(),
    name: "01 Проекты",
    kind: "folder",
    path: "C:/Vault/01 Проекты",
    children: [
      {
        id: id(),
        name: "Архитектура дашборда.md",
        kind: "markdown",
        path: "C:/Vault/01 Проекты/Архитектура дашборда.md",
        size: 4820,
        modified: "2026-02-14",
        content: `# Архитектура дашборда

Дашборд построен на вложенных блоках произвольной глубины.

## Слои
1. **Vault** — файловая система заметок Obsidian
2. **Blocks** — виджеты дашборда (группы, заметки, файлы, схемы)
3. **Viewers** — отдельные страницы просмотра/редактирования

Связанные заметки: [[Roadmap]], [[Техническое задание]]

\`\`\`ts
interface Block {
  id: string;
  type: BlockType;
  children: Block[];
}
\`\`\`
`,
      },
      {
        id: id(),
        name: "Roadmap.md",
        kind: "markdown",
        path: "C:/Vault/01 Проекты/Roadmap.md",
        size: 1210,
        modified: "2026-02-10",
        content: `# Roadmap

## Q1
- Вложенные блоки ✅
- Просмотрщик PDF ✅
- Hostly формат ✅

## Q2
- Полная синхронизация с Obsidian REST API
- Мобильная версия

Смотри также [[Архитектура дашборда]]
`,
      },
      {
        id: id(),
        name: "Техническое задание.pdf",
        kind: "pdf",
        path: "C:/Vault/01 Проекты/Техническое задание.pdf",
        size: 88210,
        modified: "2026-02-09",
      },
      {
        id: id(),
        name: "release-notes.txt",
        kind: "text",
        path: "C:/Vault/01 Проекты/release-notes.txt",
        size: 640,
        modified: "2026-02-08",
        content: `v0.4.0
- Добавлена вложенность блоков без ограничения глубины
- Встроенный просмотрщик PDF и текстовых файлов
- Поддержка формата .hostly
- Кнопка "Открыть папку" рядом с каждым файлом

v0.3.0
- Тёмная техно-минимал тема
- Первая версия дашборда
`,
      },
    ],
  },
  {
    id: id(),
    name: "02 Инфраструктура",
    kind: "folder",
    path: "C:/Vault/02 Инфраструктура",
    children: [
      {
        id: id(),
        name: "home-lab.hostly",
        kind: "hostly",
        path: "C:/Vault/02 Инфраструктура/home-lab.hostly",
        size: 980,
        modified: "2026-02-12",
        hostlyId: "hostly-home",
      },
      {
        id: id(),
        name: "Release pipeline.flow",
        kind: "flowchart",
        path: "C:/Vault/02 Инфраструктура/Release pipeline.flow",
        size: 1540,
        modified: "2026-02-13",
        flowchartId: "flow-release",
      },
      {
        id: id(),
        name: "Vault sync.flow",
        kind: "flowchart",
        path: "C:/Vault/02 Инфраструктура/Vault sync.flow",
        size: 990,
        modified: "2026-02-06",
        flowchartId: "flow-vault",
      },
    ],
  },
  {
    id: id(),
    name: "03 Инструменты",
    kind: "folder",
    path: "C:/Vault/03 Инструменты",
    children: [
      {
        id: id(),
        name: "Obsidian.exe",
        kind: "executable",
        path: "C:/Program Files/Obsidian/Obsidian.exe",
        size: 152_000_000,
        modified: "2025-11-02",
      },
      {
        id: id(),
        name: "VS Code.exe",
        kind: "executable",
        path: "C:/Program Files/Microsoft VS Code/Code.exe",
        size: 210_000_000,
        modified: "2025-10-21",
      },
    ],
  },
];

// Flatten helper — build a lookup map of file id -> VaultFile
export function flattenVault(nodes: VaultFile[]): Map<string, VaultFile> {
  const map = new Map<string, VaultFile>();
  const walk = (items: VaultFile[]) => {
    for (const item of items) {
      map.set(item.id, item);
      if (item.children) walk(item.children);
    }
  };
  walk(nodes);
  return map;
}

export const vaultFileMap = flattenVault(vaultTree);

function findByName(name: string): VaultFile | undefined {
  return Array.from(vaultFileMap.values()).find((f) => f.name === name);
}

// -------------------- Default dashboard blocks --------------------
export const defaultBlocks: Block[] = [
  {
    id: id(),
    type: "group",
    title: "Обзор проекта",
    accent: "cyan",
    data: {},
    children: [
      {
        id: id(),
        type: "note",
        title: "О дашборде",
        accent: "cyan",
        data: {
          markdown: `Дашборд для **Obsidian** в стиле _techno minimal_.

Поддерживает вложенные блоки любой глубины, просмотр PDF/текста,
формат \`.hostly\` и редактируемые блок-схемы \`.flow\`.`,
        },
        children: [],
      },
      {
        id: id(),
        type: "checklist",
        title: "Чек-лист запуска",
        accent: "cyan",
        data: {
          items: [
            { id: id(), label: "Подключить vault", done: true },
            { id: id(), label: "Настроить Local REST API", done: true },
            { id: id(), label: "Проверить PDF-вьюер", done: false },
            { id: id(), label: "Импортировать .hostly файлы", done: false },
          ],
        },
        children: [],
      },
    ],
  },
  {
    id: id(),
    type: "group",
    title: "Проекты",
    accent: "violet",
    data: {},
    children: [
      {
        id: id(),
        type: "file-list",
        title: "Заметки и документы",
        accent: "violet",
        data: {
          fileIds: [
            findByName("Архитектура дашборда.md")?.id,
            findByName("Roadmap.md")?.id,
            findByName("Техническое задание.pdf")?.id,
            findByName("release-notes.txt")?.id,
          ].filter(Boolean) as string[],
        },
        children: [
          {
            id: id(),
            type: "group",
            title: "Архив",
            accent: "violet",
            data: {},
            children: [
              {
                id: id(),
                type: "note",
                title: "Заметка об архиве",
                accent: "violet",
                data: { markdown: "Старые версии ТЗ и черновики хранятся здесь." },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: id(),
    type: "group",
    title: "Инфраструктура",
    accent: "amber",
    data: {},
    children: [
      {
        id: id(),
        type: "hostly",
        title: "Хосты домашней лаборатории",
        accent: "amber",
        data: { hostlyId: "hostly-home" },
        children: [],
      },
      {
        id: id(),
        type: "flowchart",
        title: "Release pipeline",
        accent: "amber",
        data: { flowchartId: "flow-release" },
        children: [],
      },
      {
        id: id(),
        type: "flowchart",
        title: "Vault sync",
        accent: "amber",
        data: { flowchartId: "flow-vault" },
        children: [],
      },
    ],
  },
  {
    id: id(),
    type: "group",
    title: "Программы",
    accent: "rose",
    data: {},
    children: [
      {
        id: id(),
        type: "file-list",
        title: "Быстрый запуск",
        accent: "rose",
        data: {
          fileIds: [findByName("Obsidian.exe")?.id, findByName("VS Code.exe")?.id].filter(
            Boolean
          ) as string[],
        },
        children: [],
      },
      {
        id: id(),
        type: "link",
        title: "Obsidian Publish",
        accent: "rose",
        data: { url: "https://obsidian.md/publish", linkLabel: "Открыть сайт публикации" },
        children: [],
      },
    ],
  },
];
