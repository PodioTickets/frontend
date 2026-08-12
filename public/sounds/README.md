# Efeitos sonoros da UI

Coloque aqui os arquivos de áudio usados pela interface.

## Widget de suporte do organizador (`OrganizerSupportWidget`)

- `support-open.mp3` — tocado ao ABRIR o card de suporte.
- `support-close.mp3` — tocado ao FECHAR o card.

Recomendações: sons curtos (~0.1–0.4s), leves, tipo "pop"/"whoosh"/"blip".
Formato `.mp3` (amplo suporte em navegadores). O volume é atenuado no código
(`volume = 0.35`). Se um arquivo não existir, o widget simplesmente não toca
(falha silenciosa) — a animação continua funcionando.

### Onde encontrar sons (royalty-free)

- **Pixabay Sound Effects** — https://pixabay.com/sound-effects/ (grátis, sem
  atribuição). Busque por "pop", "bubble pop", "ui click", "notification", "whoosh".
- **Mixkit** — https://mixkit.co/free-sound-effects/ (grátis, sem atribuição). Boas
  categorias: "Interface", "Notifications", "Pop".
- **Freesound** — https://freesound.org/ (checar a licença por som; muitos CC0).
- **Zapsplat** — https://www.zapsplat.com/ (grátis com conta; alguns exigem crédito).
- **Uppbeat** / **Epidemic Sound** — pagos, catálogo premium.
