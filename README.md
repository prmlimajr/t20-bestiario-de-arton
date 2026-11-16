# T20 — Bestiário de Arton

Compêndios de ameaças, parceiros e itens do *Bestiário de Arton* para o sistema Tormenta20 (v1.6.7, Foundry v14).

## Estrutura

```
src/ameacas/<criatura>.json   fonte de cada ameaça (só o que difere do modelo)
tools/modelos/*.json          modelos npc / arma / poder (extraídos das ameaças do sistema)
tools/build.mjs               compila src/ → packs/ (LevelDB)
assets/tokens/                imagens de token (de SDD/fontes/"Token - NOME.png")
packs/                        compêndios gerados — não editar à mão
```

## Adicionar uma criatura

1. Copie `assets/tokens/<slug>.png` de `SDD/fontes/Token - <Nome>.png`.
2. Crie `src/ameacas/<slug>.json` (use `abelha-grifo.json` como exemplo).
3. `npm install` (uma vez) e `npm run build`.

A pasta "ND x" do compêndio é criada a partir de `system.attributes.nd`.

### Convertendo o bloco de estatísticas

O sistema calcula, para NPCs: **perícia = ⌊ND/2⌋ + atributo + treino (se treinado) + outros**,
com treino = 2 (ND ≤ 6), 4 (ND 7–14) ou 6 (ND 15+). **Defesa = base + Destreza**.
Ajuste `treinado`/`outros` e `defesa.base` para chegar aos números do livro.
O dano das armas naturais é escrito por extenso (ex.: `4d6+18`), como nas ameaças do sistema.
