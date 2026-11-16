// Recalcula a ficha a partir do pack, com as fórmulas do sistema, e imprime para conferir com o livro.
import { ClassicLevel } from "classic-level";
import path from "node:path";
import { fileURLToPath } from "node:url";
const db = new ClassicLevel(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packs/ameacas"), { valueEncoding: "json" });
const docs = {}; for await (const [k, v] of db.iterator()) docs[k] = v; await db.close();
const sg = n => (n >= 0 ? "+" : "") + n;
for (const [k, a] of Object.entries(docs)) {
  if (!k.startsWith("!actors!")) continue;
  const s = a.system, nv = Number(s.attributes.nd) || 1, meio = Math.floor(nv / 2), treino = nv > 14 ? 6 : nv > 6 ? 4 : 2;
  const at = x => s.atributos[x].base;
  const per = x => { const p = s.pericias[x]; return meio + at(p.atributo) + (p.treinado ? treino : 0) + p.outros; };
  const outras = Object.entries(s.pericias).filter(([x, p]) => !["inic","perc","fort","refl","vont","luta","pont"].includes(x) && (p.treinado || p.outros)).map(([x]) => `${x} ${sg(per(x))}`);
  const mv = Object.entries(s.attributes.movement).filter(([x, v]) => v?.base).map(([x, v]) => `${x} ${v.base}`).join(", ");
  const res = Object.entries(s.tracos.resistencias).filter(([, v]) => v.base || v.imunidade || v.vulnerabilidade).map(([x, v]) => v.imunidade ? `imune ${x}` : v.vulnerabilidade ? `vuln ${x}` : `${x} ${v.base}`).join(", ");
  console.log(`\n${a.name} — ND ${s.attributes.nd} ${s.detalhes.tipo}/${s.tracos.tamanho}/${s.detalhes.role} token ${a.prototypeToken.width} img ${a.img.split("/").pop()}`);
  console.log(`  Inic ${sg(per("inic"))} Perc ${sg(per("perc"))} | Def ${s.attributes.defesa.base + at("des")} Fort ${sg(per("fort"))} Ref ${sg(per("refl"))} Von ${sg(per("vont"))} | PV ${s.attributes.pv.max} | ${mv}`);
  console.log(`  sentidos ${s.attributes.sentidos.value} ${s.attributes.sentidos.custom} | res: ${res} | ic: ${s.tracos.ic.value} ${s.tracos.ic.custom} | ${outras.join(", ")}`);
  for (const id of a.items) {
    const i = docs[`!actors.items!${a._id}.${id}`], r = i.system.rolls;
    if (i.type === "arma") { const p = r[0].parts; console.log(`  ⚔ ${i.name} x${i.system.qtd || 1} ${sg(per(p[1][0]) + Number(p[2][0]))} (${r[1].parts.map(q => q.slice(0,2).join(" ")).join(" + ")}) crit ${i.system.criticoM}/x${i.system.criticoX} ${i.system.alcance}`); }
    else console.log(`  • ${i.name} [${i.system.ativacao.execucao}] ${i.system.resistencia.txt} ${r.map(x => x.name + ":" + x.parts[0][0] + " " + x.parts[0][1]).join("; ")}`);
  }
}
