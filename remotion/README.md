# SAGE Storyboard — Remotion

Animated build of the SAGE explainer video, **Scene 04 → Closing**, in Remotion.

Mirrors `SAGE_Storyboard_Draft3_Revised.pdf`. Scene 04 is the focal scene per the brief; the rest of the deck continues from there with shared visual language (hexagons, accent colors per layer, progress bar across SEO / AEO / GEO).

## Compositions

The `Root.tsx` registers one composition per scene plus a stitched `Main`:

| Composition ID | Duration | Beat                                       |
| -------------- | -------- | ------------------------------------------ |
| `Main`         | 53 s     | Scene 04 through Closing                   |
| `Scene04`      | 5 s      | The Three Searches (Google / Siri / ChatGPT) |
| `Scene05`      | 11 s     | Are You One of Them? (A + B)               |
| `Scene06`      | 8 s      | Layer 1 — SEO                              |
| `Scene07`      | 8 s      | Layer 2 — AEO                              |
| `Scene08`      | 7 s      | Layer 3 — GEO                              |
| `Scene09`      | 10 s     | The Result — Venn → SAGE                   |
| `Closing`      | 4 s      | Logo lockup                                |

Format: 1920×1080 @ 30 fps.

## Run

```bash
cd remotion
npm install      # or: bun install
npm run dev      # opens Remotion Studio at http://localhost:3000
```

In Studio, pick `Scene04` from the sidebar to preview the focal scene, or `Main` to play the whole sequence.

## Render

```bash
# full sequence
npm run build

# scene 04 only
npm run build:scene4

# or any composition by id
npx remotion render <CompositionID> out/<file>.mp4
```

## Notes on the design

- **Scene 04** is the storyboard's pivot — visuals carry the rest while VO drops the long platform list. Three cards land in rhythm (Google · Siri · ChatGPT) with a gold connector and an editorial supertitle.
- **Color system** matches the storyboard: SEO green `#3FB67A`, AEO blue `#4A8FE7`, GEO purple `#9B7AE6`, brand gold `#F5C26B`.
- **Glyphs** for Google / Siri / ChatGPT are abstract stylized marks built in SVG (no real logos used).
- **Scene 09** uses a Venn diagram (per Draft 3 revision) — three circles drift in, converge, and the SAGE hexagon emerges at the intersection.
