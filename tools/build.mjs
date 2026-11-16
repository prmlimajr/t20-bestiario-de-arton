// Compila src/<pack>/*.json em compêndios LevelDB (packs/<pack>) para o Foundry v14.
//
// Cada arquivo-fonte guarda só o que difere do modelo (tools/modelos/<tipo>.json);
// o build mescla fonte + modelo, gera IDs estáveis (hash do nome) e grava no
// formato de chaves do Foundry (!actors!id, !actors.items!ator.item, !folders!id).
//
// Uso: npm install && npm run build
import { ClassicLevel } from "classic-level";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULO = JSON.parse(fs.readFileSync(path.join(RAIZ, "module.json"), "utf8"));
const AGORA = Date.now();
const SISTEMA = { systemId: "tormenta20", systemVersion: "1.6.7", coreVersion: "14.366" };

const modelo = (tipo) => JSON.parse(fs.readFileSync(path.join(RAIZ, "tools/modelos", `${tipo}.json`), "utf8"));

/** ID de 16 caracteres alfanuméricos, estável entre builds. */
function gerarId(chave) {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const hash = createHash("sha256").update(chave).digest();
  return Array.from(hash.subarray(0, 16), (b) => abc[b % abc.length]).join("");
}

/** Mescla profunda: objetos são mesclados, arrays e valores substituem. */
function mesclar(base, extra) {
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
      mesclar(base[k], v);
    } else base[k] = v;
  }
  return base;
}

/** Caminho relativo ao módulo (assets/...) → caminho servido pelo Foundry. */
const caminhoImg = (img) => (img && img.startsWith("assets/") ? `modules/${MODULO.id}/${img}` : img);

function stats() {
  return { ...SISTEMA, createdTime: AGORA, modifiedTime: AGORA, lastModifiedBy: null, compendiumSource: null, duplicateSource: null, exportSource: null };
}

function pastaND(nd) {
  const nome = `ND ${nd}`;
  // Ordena ND fracionários (1/4, 1/2) antes dos inteiros.
  const valor = nd.includes("/") ? Number(nd.split("/")[0]) / Number(nd.split("/")[1]) : Number(nd);
  return { _id: gerarId(`pasta:${nome}`), name: nome, type: "Actor", folder: null, sorting: "a", sort: Math.round(valor * 1000), color: null, description: "", flags: {}, _stats: stats() };
}

function montarAtor(fonte, arquivo) {
  const ator = mesclar(modelo("npc"), { ...fonte, items: [] });
  const id = gerarId(`ator:${fonte.name}`);
  ator._id = id;
  ator.img = caminhoImg(fonte.img);
  ator.prototypeToken.name = fonte.name;
  ator.prototypeToken.texture.src = ator.img;
  ator._stats = stats();
  ator.items = (fonte.items ?? []).map((it, i) => montarItem(it, `item:${fonte.name}`, (i + 1) * 100000));
  if (!fonte.name || !fonte.system?.attributes?.nd) throw new Error(`${arquivo}: "name" e "system.attributes.nd" são obrigatórios`);
  return ator;
}

const REGRAS_MONTARIA = fs.readFileSync(path.join(RAIZ, "tools/textos/regras-montaria.html"), "utf8").trim();

/** Item (solto ou embutido em ator) com seus efeitos mesclados aos modelos. */
function montarItem(fonte, prefixo, sort = 0) {
  if (!fonte.name || !fonte.type) throw new Error(`item sem "name"/"type" em ${prefixo}`);
  const item = mesclar(modelo(fonte.type), { ...fonte, effects: [] });
  item._id = gerarId(`${prefixo}:${fonte.type}:${fonte.name}`);
  item.img = caminhoImg(fonte.img ?? item.img);
  item.sort = sort;
  item._stats = stats();
  // Montarias levam as Regras de Montarias do livro básico, como as do sistema.
  if (item.system.subtipo === "Montaria") item.system.description.value += `\n${REGRAS_MONTARIA}`;
  item.effects = (fonte.effects ?? []).map((ef) => {
    const efeito = mesclar(modelo("efeito"), ef);
    efeito._id = gerarId(`efeito:${item._id}:${ef.name}`);
    efeito.img = caminhoImg(ef.img ?? item.img);
    efeito.origin = `Item.${item._id}`;
    efeito._stats = stats();
    return efeito;
  });
  return item;
}

async function buildItens(pack) {
  const dir = path.join(RAIZ, "src", pack);
  const docs = [];
  for (const arq of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : []) {
    const item = montarItem(JSON.parse(fs.readFileSync(path.join(dir, arq), "utf8")), `${pack}`);
    item.folder = null;
    item.effects = item.effects.map((ef) => {
      docs.push([`!items.effects!${item._id}.${ef._id}`, ef]);
      return ef._id;
    });
    docs.push([`!items!${item._id}`, item]);
    console.log(`  ${pack}: ${item.name}`);
  }
  await gravar(pack, docs);
}

async function gravar(pack, docs) {
  const destino = path.join(RAIZ, "packs", pack);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  const db = new ClassicLevel(destino, { valueEncoding: "json" });
  const lote = db.batch();
  for (const [chave, valor] of docs) lote.put(chave, valor);
  await lote.write();
  await db.compactRange("\x00", "\xff");
  await db.close();
}

async function buildAtores(pack) {
  const dir = path.join(RAIZ, "src", pack);
  const docs = [];
  const pastas = new Map();
  for (const arq of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : []) {
    const ator = montarAtor(JSON.parse(fs.readFileSync(path.join(dir, arq), "utf8")), arq);
    const pasta = pastaND(ator.system.attributes.nd);
    pastas.set(pasta._id, pasta);
    ator.folder = pasta._id;
    ator.sort = 0;

    // Itens e efeitos embutidos ficam em chaves próprias; o ator guarda só os IDs.
    for (const item of ator.items) {
      item.effects = (item.effects ?? []).map((ef) => {
        docs.push([`!actors.items.effects!${ator._id}.${item._id}.${ef._id}`, ef]);
        return ef._id;
      });
      docs.push([`!actors.items!${ator._id}.${item._id}`, item]);
    }
    ator.items = ator.items.map((i) => i._id);
    ator.effects = [];
    docs.push([`!actors!${ator._id}`, ator]);
    console.log(`  ${pack}: ${ator.name} (ND ${ator.system.attributes.nd})`);
  }
  for (const p of pastas.values()) docs.push([`!folders!${p._id}`, p]);
  await gravar(pack, docs);
  return docs.length;
}

for (const pack of MODULO.packs) {
  if (pack.type === "Actor") await buildAtores(pack.name);
  else await buildItens(pack.name);
  console.log(`✔ packs/${pack.name}`);
}
