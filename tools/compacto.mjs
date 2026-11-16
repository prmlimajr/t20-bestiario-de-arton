// Formato compacto de ameaça: os números são escritos como aparecem no livro
// (Iniciativa +9, Defesa 22, ataque +15...) e aqui são convertidos para os
// campos que o sistema Tormenta20 v1.6.7 usa para recalcular a ficha.
//
// Fórmulas do sistema para NPC (module/dataModel/actor/menace.mjs + creature.mjs):
//   meionivel = ⌊ND/2⌋;  treino = 2 (ND ≤ 6), 4 (ND 7–14), 6 (ND 15+)
//   perícia   = meionivel + atributo + (treinado ? treino : 0) + outros
//   defesa    = base + Destreza
// O dano das armas naturais é escrito por extenso, como nas ameaças do sistema.

const RESISTENCIAS = ["fort", "refl", "vont"];
const TAMANHO_TOKEN = { min: 0.5, peq: 1, med: 1, gra: 2, eno: 3, col: 4 };
const MOVIMENTO = { deslocamento: "walk", escalada: "climb", voo: "fly", natacao: "swim", escavacao: "burrow" };
const EXECUCAO = { passiva: "passive", padrao: "action", movimento: "move", completa: "full", reacao: "reaction", livre: "free" };

const ICONE_ARMA = {
  mordida: "icons/creatures/abilities/mouth-teeth-long-red.webp",
  garras: "icons/creatures/claws/claw-bear-paw-swipe-red.webp",
  chifres: "systems/tormenta20/icons/poderes/ameacas/chifres.webp",
  cascos: "systems/tormenta20/icons/poderes/ameacas/cascos.webp",
  pancada: "systems/tormenta20/icons/poderes/ameacas/pancada.webp",
  cimitarra: "systems/tormenta20/icons/itens/equipamentos/cimitarra.webp",
  "arco curto": "systems/tormenta20/icons/itens/equipamentos/arco-curto.webp"
};

function valorND(nd) {
  if (["S", "S+"].includes(nd)) return 20;
  return Number(nd) || 1; // "1/2", "1/4" → 1, como no sistema
}

/** Total do livro → { treinado, outros } com a fórmula do sistema. */
function pericia(chave, total, atributo, meio, treino) {
  const resto = total - meio - atributo;
  if (RESISTENCIAS.includes(chave) || resto < treino) return { treinado: false, outros: resto };
  return { treinado: true, outros: resto - treino };
}

/** "18" | "x3" | "19/x3" → { criticoM, criticoX } */
function critico(txt = "") {
  const [m, x] = String(txt).includes("/") ? txt.split("/") : txt.startsWith("x") ? [null, txt] : [txt, null];
  return { criticoM: Number(m) || 20, criticoX: Number(String(x ?? "").replace("x", "")) || 2 };
}

/** [["2d8+8","corte"], ["1d6","eletricidade"]] → partes de rolagem do sistema */
const partes = (danos) => danos.map(([formula, tipo = ""]) => [formula, tipo, ""]);

function rolagens(danos = []) {
  // Cada entrada: [formula, tipo, nome?] — uma rolagem por entrada.
  return danos.map(([formula, tipo = "", nome = "Dano"], i) => ({ name: nome, key: `dano${i}`, type: "dano", parts: [[formula, tipo, ""]], versatil: "", adaptavel: "" }));
}

function expandirArma(a, totais) {
  const pericia = a.pericia ?? (a.alcance ? "pont" : "luta");
  const bonus = a.ataque - totais[pericia]; // diferença em relação à perícia base, se houver
  const nome = a.arma;
  return {
    name: nome,
    type: "arma",
    img: a.img ?? ICONE_ARMA[nome.toLowerCase()] ?? ICONE_ARMA.garras,
    system: {
      description: { value: `<section class="secret">${a.descricao ?? nome}</section>` },
      ...(a.qtd ? { qtd: a.qtd } : {}),
      ...critico(a.critico),
      alcance: a.alcance ?? "",
      proposito: a.proposito ?? (a.alcance ? "disparo" : "corpo-a-corpo"),
      rolls: [
        { name: "Ataque", key: "ataque0", type: "ataque", parts: [["1d20", "", ""], [pericia, "", ""], [String(bonus), "", ""]], versatil: "", adaptavel: "" },
        { name: "Dano", key: "dano1", type: "dano", parts: partes(a.dano), versatil: "", adaptavel: "" }
      ]
    }
  };
}

function expandirPoder(p) {
  return {
    name: p.poder,
    type: "poder",
    img: p.img ?? "icons/svg/item-bag.svg",
    system: {
      description: { value: p.descricao },
      ativacao: { execucao: EXECUCAO[p.acao ?? "passiva"] ?? p.acao, custo: p.custo ?? 0 },
      resistencia: { txt: p.resistencia ?? "" },
      rolls: rolagens(p.danos)
    },
    ...(p.efeitos ? { effects: p.efeitos } : {})
  };
}

/** Converte a fonte compacta no formato { name, img, system, prototypeToken, items }. */
export function expandirAmeaca(f, modeloNpc) {
  const nd = String(f.nd);
  const nivel = valorND(nd);
  const meio = Math.floor(nivel / 2);
  const treino = nivel > 14 ? 6 : nivel > 6 ? 4 : 2;
  const atr = f.atributos;

  // Perícia de ataque = primeiro ataque corpo a corpo / à distância, se não informada.
  const armas = f.ataques ?? [];
  const totais = { ...f.pericias };
  totais.luta ??= armas.find((a) => !a.alcance && (a.pericia ?? "luta") === "luta")?.ataque;
  totais.pont ??= armas.find((a) => a.alcance || a.pericia === "pont")?.ataque;

  const pericias = {};
  for (const [chave, total] of Object.entries(totais)) {
    if (total === undefined) continue;
    const a = modeloNpc.system.pericias[chave]?.atributo;
    if (!a) throw new Error(`${f.nome}: perícia desconhecida "${chave}"`);
    pericias[chave] = pericia(chave, total, atr[a], meio, treino);
  }

  const resist = {};
  for (const [tipo, v] of Object.entries(f.resistencias ?? {})) {
    resist[tipo] = v === "imune" ? { imunidade: true } : v === "vulneravel" ? { vulnerabilidade: true } : { base: v };
  }

  const movement = {};
  for (const [pt, en] of Object.entries(MOVIMENTO)) movement[en] = { base: f.deslocamento?.[pt] ?? 0 };

  const tamanho = f.tamanho ?? "med";
  const lado = TAMANHO_TOKEN[tamanho];

  return {
    name: f.nome,
    img: f.img,
    system: {
      atributos: Object.fromEntries(Object.entries(atr).map(([k, v]) => [k, { base: v }])),
      attributes: {
        nd,
        pv: { value: f.pv, max: f.pv },
        pm: { value: f.pm ?? 0, max: f.pm ?? 0 },
        defesa: { base: f.defesa - atr.des },
        movement,
        sentidos: { value: f.sentidos ?? [], custom: f.sentidosExtra ?? "" }
      },
      detalhes: {
        tipo: f.tipo,
        raca: f.raca ?? "",
        role: f.papel,
        resistencias: f.resistenciasTexto ?? "",
        ataquescac: f.corpoACorpo ?? "",
        ataquesad: f.aDistancia ?? "",
        equipamento: f.equipamento ?? "",
        tesouro: f.tesouro ?? "",
        biography: { value: f.notas ?? "" }
      },
      tracos: {
        tamanho,
        resistencias: resist,
        ic: { value: f.imunidadeCondicoes ?? [], custom: f.imunidadeOutras ?? "" },
        idiomas: { value: f.idiomas ?? [] }
      },
      pericias
    },
    prototypeToken: { width: lado, height: lado },
    items: [...armas.map((a) => expandirArma(a, totais)), ...(f.habilidades ?? []).map(expandirPoder)]
  };
}
