import type { TypographySettings, TypographyGroup } from "../store/dashboardStore";

// Tailwind-классы размера и их стандартный размер в px
const TW_SIZES: [string, number][] = [
  ["text-[8px]", 8],
  ["text-[9px]", 9],
  ["text-[10px]", 10],
  ["text-[11px]", 11],
  ["text-[12px]", 12],
  ["text-[13px]", 13],
  ["text-[14px]", 14],
  ["text-xs", 12],
  ["text-sm", 14],
  ["text-base", 16],
  ["text-lg", 18],
  ["text-xl", 20],
  ["text-2xl", 24],
];

const r = (n: number) => Math.round(n * 10) / 10;

/** Правила для одной области: пропорциональный размер + толщина */
function scopeRules(scope: string, g: TypographyGroup, baseSize: number, exclude = ""): string {
  const k = g.fontSize / baseSize;
  const strong = Math.min(900, g.fontWeight + 200);
  const not = exclude ? `:not(${exclude})` : "";

  let css = `${scope}{font-size:${g.fontSize}px !important;font-weight:${g.fontWeight} !important;}\n`;

  for (const [cls, px] of TW_SIZES) {
    css += `${scope} [class~="${cls}"]${not}{font-size:${r(px * k)}px !important;}\n`;
  }

  // элементы без класса толщины наследуют выбранную толщину (перебивает CSS тем)
  css += `${scope} :is(div,span,p,a,button,li,label,input,h1,h2,h3,h4,h5,h6)${not}:not([class*="font-"]){font-weight:inherit !important;}\n`;
  css += `${scope} :is([class~="font-light"],[class~="font-normal"],[class~="font-medium"])${not}{font-weight:${g.fontWeight} !important;}\n`;
  css += `${scope} :is([class~="font-semibold"],[class~="font-bold"])${not}{font-weight:${strong} !important;}\n`;

  return css;
}

export function buildTypographyCss(t: TypographySettings): string {
  // удвоенные классы — чтобы специфичность была выше, чем у CSS тем
  const root = `body .Lemo-root.Lemo-root`;
  const sidebar = `${root} .nd-typo-sidebar.nd-typo-sidebar`;
  const dash = `${root} :is(main[data-page="dashboard"],main[data-page="board"])`;
  const content = `${dash} .nd-block-content.nd-block-content`;
  const md = ".techno-markdown, .techno-markdown *";

  const d = t.dashboard;
  const dStrong = Math.min(900, d.fontWeight + 200);
  const bt = t.blockTitle;

  let css = "";

  // 1. Боковая панель
  css += scopeRules(sidebar, t.sidebar, 13);

  // 2. Дашборд (общий текст страницы)
  css += scopeRules(dash, d, 14);

  // 3. Текст заметок (markdown) — тоже настройка «Дашборд»
  css += `${dash} .techno-markdown{font-size:${d.fontSize}px !important;font-weight:${d.fontWeight} !important;}\n`;
  css += `${dash} .techno-markdown :is(p,li,span,td,th,blockquote,a,em,code){font-size:inherit !important;font-weight:inherit !important;}\n`;
  css += `${dash} .techno-markdown strong{font-weight:${dStrong} !important;}\n`;
  css += `${dash} .techno-markdown h1{font-size:1.5em !important;font-weight:${dStrong} !important;}\n`;
  css += `${dash} .techno-markdown h2{font-size:1.3em !important;font-weight:${dStrong} !important;}\n`;
  css += `${dash} .techno-markdown :is(h3,h4,h5,h6){font-size:1.15em !important;font-weight:${dStrong} !important;}\n`;

  // 4. Файлы, папки, кнопки (содержимое блоков, кроме заметок)
  css += scopeRules(content, t.blockContent, 12, md);

  // 5. Названия блоков
  css += `${dash} .nd-block-title.nd-block-title{font-size:${bt.fontSize}px !important;font-weight:${bt.fontWeight} !important;}\n`;

  return css;
}