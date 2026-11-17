import { build } from "vite";
import { resolve } from "node:path";

// 프로젝트의 실제 TS 소스를 메모리에서 번들링한다. 테스트용 산출물은 쓰지 않는다.
export async function loadSource(file) {
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      target: "esnext",
      lib: { entry: resolve(file), formats: ["es"] },
    },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  const chunk = bundle.output.find((entry) => entry.type === "chunk");
  return import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`);
}
