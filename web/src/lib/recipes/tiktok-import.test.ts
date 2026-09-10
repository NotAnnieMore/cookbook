import assert from "node:assert/strict";
import test from "node:test";

import { canonicalTikTokVideoUrl, extractRecipeFromTikTokOEmbed, prepareTikTokCaption } from "./tiktok-import.ts";

const caption = `Honey Glazed Bacon Wrapped Garlic Chicken Bites
Indulge in these delicious savory and sweet bites.  **Ingredients:**  * Garlic chicken bites * Bacon * Honey  **Instructions:**  1. Prepare your garlic chicken bites. 2. Wrap each chicken bite with a strip of bacon. 3. Cook until crispy. 4. Glaze generously with honey.`;

test("removes TikTok sharing parameters from a direct video URL", () => {
  assert.equal(
    canonicalTikTokVideoUrl("https://www.tiktok.com/@shewillevolve/video/7636525672646724895?_r=1&utm_source=share"),
    "https://www.tiktok.com/@shewillevolve/video/7636525672646724895",
  );
  assert.equal(canonicalTikTokVideoUrl("https://example.com/video/123"), null);
});

test("turns an inline TikTok caption into parseable recipe sections", () => {
  const prepared = prepareTikTokCaption(caption);
  assert.match(prepared, /\nIngredients\n/);
  assert.match(prepared, /\nInstructions\n/);

  const result = extractRecipeFromTikTokOEmbed(JSON.stringify({
    provider_name: "TikTok",
    author_name: "She Will Evolve",
    title: caption,
  }));

  assert.equal(result.draft?.title, "Honey Glazed Bacon Wrapped Garlic Chicken Bites");
  assert.equal(result.draft?.ingredients.length, 3);
  assert.equal(result.draft?.steps.length, 4);
  assert.equal(result.authorName, "She Will Evolve");
  assert.equal(result.caption, caption);
});

test("splits emoji bullets, preparation steps and ingredient groups from TikTok", () => {
  const portugueseCaption = "Bolo Bolacha com caramelo Salgado ✨️ Há  sabores que abraçam a alma🤎 Bolo de bolacha com caramelo Salgado:doce,intenso e com aquele toque salgado que faz toda a diferença.  Ingredientes: 👉1 lata condensado cozido  👉400ml natas 👉3folhas gelatina 👉Bolacha maria q.b 👉Café q.b 👉 amêndoa granulada  Caramelo salgado  👉120gr açúcar  👉30gr manteiga 👉180ml natas  👉Flor sal Preparação: 👉Começamos por hidratar gelatina em água fria  👉Bater as natas com leite condensado cozido. 👉Molhar as bolachas no café. 👉Levar ao frigorífico um dia para outro. 👉Fazer o caramelo com o açúcar. 👉Juntar as natas quentes. 👉Retirar do lume. 👉Juntar a manteiga e flor de sal #semifrio #caramelosalgado #toffee";
  const result = extractRecipeFromTikTokOEmbed(JSON.stringify({
    provider_name: "TikTok",
    author_name: "A Pimenta Rosa",
    title: portugueseCaption,
  }));

  assert.equal(result.draft?.title, "Bolo Bolacha com caramelo Salgado ✨️");
  assert.equal(result.draft?.ingredients.length, 10);
  assert.equal(result.draft?.ingredients[6].group, "Caramelo salgado");
  assert.equal(result.draft?.ingredients[6].unit, "g");
  assert.equal(result.draft?.steps.length, 8);
  assert.deepEqual(result.draft?.tags, ["semifrio", "caramelosalgado", "toffee"]);
});

test("accepts the misspelled preparation heading used by a real TikTok caption", () => {
  const realCaption = "Tiramisú lotus biscoff  Este Tiramisú  de lotus é delicioso a cada colherada, cheio sabor e super fácil fazer.Sobremesa perfeita. Guarda já a receita  Ingredientes: 👉400gr mascarpone 👉 creme biscoff lotus 👉2colheres sopa açúcar 👉 Bolachas lotus 👉2ovos 👉 café  q.b Prepração: 👉Separar as gemas das claras. 👉Numa tigela colocar mascarpone, gemas, açúcar e bater bem. 👉Bater as claras em castelo e juntar ao preparado anterior. 👉Podem colocar 1colher sopa creme lotus ao creme, ou deixar simples 👉Molhar as bolachas lotus em café, e colocar em camadas,bolacha, creme ,ate terminar com creme. 👉Por cima colocar o creme lotus e levar ao frigorífico. 👉 triturei bolachas e coloquei dos lados mas é opcional. #speculoos #tiramisu #receitinhas #pastry #lotusbiscoff #feitocomamor #cookingram #biscoff #lotus";
  const result = extractRecipeFromTikTokOEmbed(JSON.stringify({
    provider_name: "TikTok",
    author_name: "A Pimenta Rosa",
    title: realCaption,
  }));

  assert.equal(result.error, null);
  assert.equal(result.draft?.title, "Tiramisú lotus biscoff");
  assert.equal(result.draft?.ingredients.length, 6);
  assert.equal(result.draft?.ingredients[2].unit, "c. sopa");
  assert.equal(result.draft?.steps.length, 7);
});
