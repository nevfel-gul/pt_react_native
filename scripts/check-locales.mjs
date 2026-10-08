#!/usr/bin/env node
// Çeviri dosyalarını İngilizceye (constants/locales/en.json) göre doğrular:
//   - eksik / fazla anahtar
//   - {{degisken}} farkları (bozuk değişken ekranda "{{name}}" diye görünür)
//   - boş metin
// Kullanım: node scripts/check-locales.mjs   (hata varsa çıkış kodu 1)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../constants/locales/", import.meta.url).pathname;
const base = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"));
const vars = (s) => [...String(s).matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort().join(",");

let errors = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const loc = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const missing = Object.keys(base).filter((k) => !(k in loc));
  const extra = Object.keys(loc).filter((k) => !(k in base));
  const badVars = Object.keys(base).filter((k) => k in loc && vars(base[k]) !== vars(loc[k]));
  const empty = Object.keys(loc).filter((k) => typeof loc[k] !== "string" || !loc[k].trim());
  const problems = missing.length + badVars.length + empty.length;
  errors += problems;
  console.log(
    `${problems ? "✗" : "✓"} ${file}: ${Object.keys(loc).length} metin` +
      (missing.length ? ` · eksik ${missing.length}` : "") +
      (extra.length ? ` · fazla ${extra.length}` : "") +
      (badVars.length ? ` · değişken farkı ${badVars.length}` : "") +
      (empty.length ? ` · boş ${empty.length}` : ""),
  );
  for (const k of [...missing.slice(0, 5), ...badVars.slice(0, 5), ...empty.slice(0, 5)]) console.log("    ", k);
}
process.exit(errors ? 1 : 0);
