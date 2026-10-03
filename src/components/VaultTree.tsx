import { useState } from "react";
import { ChevronRight, FolderOpen, PlayCircle } from "lucide-react";
import type { VaultFile } from "../types";
import { FileIcon } from "./FileIcon";
import { useDashboardStore, type Page } from "../store/dashboardStore";
import { cn } from "../utils/cn";

function openTarget(file: VaultFile, navigate: (page: Page) => void) {
  if (file.kind === "flowchart") {
    navigate({ name: "flowchart", path: file.path });
  } else if (file.kind === "hostly") {
    navigate({ name: "hostly", path: file.path });
  } else if (file.kind === "markdown" || file.kind === "text" || file.kind === "pdf") {
    navigate({ name: "file", path: file.path });
  }
}

function TreeNode({ file, depth }: { file: VaultFile; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const navigate = useDashboardStore((s) => s.navigate);
  const { launchProgram, revealInExplorer } = useDashboardStore();

  const isFolder = file.kind === "folder";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-300/90 transition-colors hover:bg-white/5 cursor-pointer"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (isFolder) setOpen((o) => !o);
          else if (file.kind === "executable") launchProgram(file);
          else openTarget(file, navigate);
        }}
      >
        {isFolder ? (
          <ChevronRight
            size={14}
            className={cn("shrink-0 text-slate-500 transition-transform", open && "rotate-90")}
          />
        ) : (
          <span className="w-[14px]" />
        )}
        <FileIcon kind={file.kind} className="h-3.5 w-3.5" />
        <span className="truncate flex-1">{file.name}</span>
        {!isFolder && (
          <span className="ml-auto hidden items-center gap-1 group-hover:flex">
            {file.kind === "executable" && (
              <button
                title="Запустить"
                onClick={(e) => {
                  e.stopPropagation();
                  launchProgram(file);
                }}
                className="rounded p-1 text-emerald-300 hover:bg-emerald-400/10"
              >
                <PlayCircle size={13} />
              </button>
            )}
            <button
              title="Показать в проводнике"
              onClick={(e) => {
                e.stopPropagation();
                revealInExplorer(file);
              }}
              className="rounded p-1 text-cyan-300 hover:bg-cyan-400/10"
            >
              <FolderOpen size={13} />
            </button>
          </span>
        )}
      </div>
      {isFolder && open && file.children && (
        <div>
          {file.children.map((child) => (
            <TreeNode key={child.id} file={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VaultTree({ files }: { files: VaultFile[] }) {
  return (
    <div className="space-y-0.5">
      {files.map((f) => (
        <TreeNode key={f.id} file={f} depth={0} />
      ))}
    </div>
  );
}