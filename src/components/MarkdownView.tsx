import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDashboardStore } from "../store/dashboardStore";
import { flattenFiles } from "../utils/vault";
import { cn } from "../utils/cn";

// Convert Obsidian-style [[wikilinks]] into markdown links and #tags into inline-code
// pills so the regular markdown pipeline can render them with custom styling.
function preprocess(md: string): string {
  let out = md.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, (_m, target: string, alias?: string) => {
    const label = alias ? alias.slice(1) : target;
    return `[${label}](#wikilink:${encodeURIComponent(target.trim())})`;
  });
  out = out.replace(/(^|[\s(])#([a-zA-Zа-яА-Я0-9_/-]+)/g, (_m, pre, tag) => `${pre}\`#${tag}\``);
  return out;
}

export function MarkdownView({ content, className }: { content: string; className?: string }) {
  const navigate = useDashboardStore((s) => s.navigate);
  const vault = useDashboardStore((s) => s.vault);
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleWikilink(target: string) {
    const name = decodeURIComponent(target);
    const files = flattenFiles(vault);
    const match = files.find(
      (f) => f.name.toLowerCase() === name.toLowerCase() ||
        f.name.toLowerCase() === `${name.toLowerCase()}.md`
    );
    if (match) {
      if (match.kind === "flowchart") navigate({ name: "flowchart", path: match.path });
      else if (match.kind === "hostly") navigate({ name: "hostly", path: match.path });
      else navigate({ name: "file", path: match.path });
    } else {
      pushToast("warning", "Заметка не найдена", `«${name}» отсутствует в vault`);
    }
  }

  return (
    <div className={cn("prose-invert techno-markdown text-xs leading-relaxed text-slate-300", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-2 mt-3 text-lg font-bold text-slate-100" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-3 text-base font-semibold text-slate-100" {...p} />,
          h3: (p) => <h3 className="mb-1.5 mt-2.5 text-sm font-semibold text-cyan-200" {...p} />,
          p: (p) => <p className="mb-2 last:mb-0" {...p} />,
          ul: (p) => <ul className="mb-2 ml-4 list-disc space-y-1" {...p} />,
          ol: (p) => <ol className="mb-2 ml-4 list-decimal space-y-1" {...p} />,
          li: (p) => <li {...p} />,
          blockquote: (p) => (
            <blockquote
              className="mb-2 border-l-2 border-cyan-400/40 bg-cyan-400/5 py-1 pl-3 italic text-slate-400"
              {...p}
            />
          ),
          code: ({ className: cls, children, ...rest }) => {
            const isBlock = cls?.includes("language-");
            const text = String(children);
            if (!isBlock && text.startsWith("#")) {
              return (
                <span className="mx-0.5 rounded bg-violet-400/10 px-1.5 py-0.5 font-mono-techno text-[11px] text-violet-300 ring-1 ring-violet-400/20">
                  {text}
                </span>
              );
            }
            if (isBlock) {
              return (
                <pre className="mb-2 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 font-mono-techno text-[12px] text-cyan-200">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono-techno text-[12px] text-amber-200" {...rest}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => {
            if (href?.startsWith("#wikilink:")) {
              const target = href.replace("#wikilink:", "");
              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleWikilink(target);
                  }}
                  className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-medium text-cyan-300 ring-1 ring-cyan-400/20 transition hover:bg-cyan-400/20"
                >
                  [[{children}]]
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">
                {children}
              </a>
            );
          },
          hr: () => <hr className="my-3 border-white/10" />,
          table: (p) => (
            <div className="mb-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...p} />
            </div>
          ),
          th: (p) => <th className="border border-white/10 bg-white/5 px-2 py-1 text-left" {...p} />,
          td: (p) => <td className="border border-white/10 px-2 py-1" {...p} />,
        }}
      >
        {preprocess(content)}
      </ReactMarkdown>
    </div>
  );
}