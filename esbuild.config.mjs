import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron"],
  format: "cjs",
  target: "es2020",
  loader: { ".png": "dataurl", ".svg": "dataurl" },
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  outfile: "D:/Matreshka/Dashboard/Matreshka/.obsidian/plugins/nexus-dashboard/main.js",
  minify: prod,
});

if (prod) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
  console.log("Слежу за изменениями... (Ctrl+C чтобы остановить)");
}