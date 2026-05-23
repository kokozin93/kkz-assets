import { registerRoot } from "remotion";
import { Root } from "./Root";

// NOTE: Google Fonts loading lives in src/fonts.ts. We don't import it here by
// default because some sandbox/cloud envs block fonts.gstatic.com and fail
// renders entirely. Locally, import "./fonts" to load Inter Tight + Inter.
// Without it, the bundled system stack ("Inter Tight", "Inter", sans-serif)
// falls back to whatever sans-serif the host has.

registerRoot(Root);
