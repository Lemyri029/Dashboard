import esbuild from "esbuild";
import process from "process";
import fs from "fs";
import path from "path";

const prod = process.argv[2] === "production";

const pluginDir =
  "D:/Matreshka/Dashboard/Matreshka/.obsidian/plugins/Lemo";

fs.mkdirSync(pluginDir, { recursive: true });

// Логгер: показывает каждую пересборку со временем
const watchLogger = {
  name: "watch-logger",
  setup(build) {
    build.onStart(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Пересборка...`);
    });
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error(`[${new Date().toLocaleTimeString()}] ОШИБКИ СБОРКИ:`, result.errors.length);
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] Build finished OK`);
      }
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron"],
  format: "cjs",
  target: "es2020",
  loader: { ".png": "dataurl", ".svg": "dataurl" },
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  outfile: path.join(pluginDir, "main.js"),
  minify: prod,
  plugins: [watchLogger],
});

if (prod) {
  await ctx.rebuild();
  await ctx.dispose();
  process.exit(0);
} else {
  await ctx.rebuild();
  await ctx.watch();
  console.log("Слежу за изменениями... (Ctrl+C чтобы остановить)");
}