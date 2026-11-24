# The World in One Day — 23 November 2026

A one-day newspaper front page for Monday 23 November 2026, drawn
entirely in code. Entry for the make.fun `news-image-20261123` bounty:
"Sum up 23 November's world news in one image".

## What it shows

Six stories that defined the day, checked against the day's reporting:

1. **Climate talks collapse** — the UN climate summit (COP31) in Turkey
   ends with no deal after record-long talks split over fossil fuels
   and finance.
2. **Ukraine sinks Russian warship** — naval drones hit the corvette
   Merkury at Benghazi, Libya; Kyiv says the war has reached the
   Mediterranean.
3. **Trump warns Iran of new strikes** — the US president threatens
   strikes in the new year as tanker attacks surge in the Strait
   of Hormuz.
4. **Democrats take the House** — the party wins at least 258 seats,
   a historic majority in the US House of Representatives.
5. **Factory fire kills 24** — a blaze at a sweets factory in
   Indonesia leaves at least 24 dead and dozens missing.
6. **AI helps prove Riemann hypothesis** — Anthropic says AI helped
   prove the famous maths puzzle.

## How it is made

`main.ts` (Node 22, standard library only) draws the whole page
itself: a 5x7 pixel font renders every headline and paragraph, small
pictograms (globe, ship, oil drop, ballot box, factory) are drawn from
rectangles and discs, and a minimal PNG encoder writes the result to
`/output/entry.png`. No network, no randomness, no clock — two runs
write byte-identical output.

Run it locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Output: a 1024x1024 PNG, well under the 1 MiB limit.

## License

MIT — see LICENSE.
