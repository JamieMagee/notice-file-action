import esbuild from "esbuild";

try {
  await esbuild.build({
    entryPoints: ["src/index.ts"],
    platform: "node",
    outdir: "dist",
    bundle: true,
    minify: true,
    splitting: true,
    format: "esm",
    target: ["esnext"],

    banner: {
      js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
    },
  });
} catch (e) {
  process.exit(1);
}
