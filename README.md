# T20 — Bestiário de Arton

Compêndios de ameaças, parceiros e itens do *Bestiário de Arton* para o sistema Tormenta20 (v1.6.7, Foundry v14).

## Estrutura

```
src/ameacas/<criatura>.json   fonte de cada ameaça (só o que difere do modelo)
src/parceiros/<parceiro>.json fonte de cada parceiro (item poder; efeitos por patamar)
src/itens/<item>.json         itens do livro (compêndio Itens; podem ser embutidos em ameaças)
tools/modelos/*.json          modelos npc / arma / poder / efeito (extraídos do sistema)
tools/textos/                 textos anexados no build (ex.: Regras de Montarias)
tools/build.mjs               compila src/ → packs/ (LevelDB)
assets/tokens/                imagens de token (de SDD/fontes/"Token - NOME.png")
packs/                        compêndios gerados — não editar à mão
```

## Adicionar uma criatura

1. Copie `assets/tokens/<slug>.png` de `SDD/fontes/Token - <Nome>.png`.
   Sem imagem, o build usa um ícone provisório e avisa no final.
2. Crie `src/ameacas/<slug>.json` no formato compacto (veja `agelfeld.json` ou `aspecto-de-azgher.json`).
3. `npm install` (uma vez) e `npm run build`.

A pasta "ND x" do compêndio é criada a partir de `nd`.

### Formato compacto (`tools/compacto.mjs`)

Os números são escritos **como no livro**; o build converte para os campos do sistema:

| Campo | Exemplo | Observação |
|---|---|---|
| `nd`, `tipo`, `tamanho`, `papel` | `"5"`, `"esp"`, `"gra"`, `"special"` | tipo: ani/con/esp/hum/mon/mor · tamanho: min/peq/med/gra/eno/col · papel: solo/lackey/special |
| `pericias` | `{ "inic": 9, "fort": 11, "atle": 7 }` | totais do livro; `luta`/`pont` vêm do 1º ataque se omitidos |
| `defesa` | `22` | |
| `deslocamento` | `{ "deslocamento": 12, "voo": 24 }` | também escalada, natacao, escavacao |
| `resistencias` | `{ "fogo": 10, "trevas": "imune", "frio": "vulneravel", "dano": 5 }` | `dano` = redução de dano geral |
| `imunidadeCondicoes` / `imunidadeOutras` | `["atordoado"]` / `"encantamento"` | condições do sistema / texto livre |
| `ataques` | `{ "arma": "Garras", "qtd": 2, "ataque": 15, "dano": [["2d8+8","corte"],["1d6","eletricidade"]], "critico": "19/x3", "alcance": "medium" }` | com `alcance` vira ataque à distância (Pontaria) |
| `habilidades` | `{ "poder": "Teia", "acao": "padrao", "resistencia": "Reflexos CD 31 evita", "danos": [["6d8","acido"]], "descricao": "<p>…</p>" }` | acao: passiva/padrao/movimento/completa/reacao/livre · `custo`: PM · tipo de dano `curapv`/`curapm` para cura |
| `pm` | `31` | pontos de mana (conjuradores) |
| `itens` | `[{ "ref": "almas-cristalizadas" }]` | embute um item de `src/itens/` no inventário (tesouro especial) |
| `notas` | `"<p><strong>Perícias:</strong> Furtividade +4 (+14 na água)</p>"` | vai para a biografia (bônus situacionais) |

Fórmulas do sistema para NPC: **perícia = ⌊ND/2⌋ + atributo + treino (se treinado) + outros**,
treino = 2 (ND ≤ 6), 4 (ND 7–14) ou 6 (ND 15+); **Defesa = base + Destreza**.
Resistências (Fort/Ref/Von) ficam sempre como "outros"; nas demais perícias o build marca treinado quando a diferença comporta o bônus de treino.
O dano das armas naturais é escrito por extenso (ex.: `4d6+18`), como nas ameaças do sistema.
Magias citadas usam link para o compêndio do sistema: `@UUID[Compendium.tormenta20.magias.Item.<id>]{Nome}`.

## Adicionar um parceiro

Crie `src/parceiros/<slug>.json` (veja `montaria-abelha-grifo.json`), seguindo o padrão das montarias do sistema:
item `poder` com `tipo: "geral"` e `subtipo: "Montaria"` (ou o tipo de parceiro), e um efeito por patamar
(Iniciante, Veterano, Mestre), cada um com **todas** as mudanças daquele patamar, já que só um fica ativo por vez.
Itens com `subtipo: "Montaria"` recebem as Regras de Montarias no fim da descrição automaticamente.
Benefícios sem chave de efeito no sistema (ex.: bônus em agarrar, ação extra) ficam na descrição do efeito como "Não automatizado".
- `npm run conferir` imprime cada ameaça recalculada pelas fórmulas do sistema, para comparar com o livro.
