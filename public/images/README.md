# Hero imagery

CivicPakistan ships with original vector artwork (`components/visuals/pakistan-scene.tsx`)
so that no third-party photograph is hotlinked or bundled.

To use a photograph instead:

1. Place a **locally owned or properly licensed** image in this folder, for example
   `public/images/hero-islamabad.jpg`. Suggested subjects: Islamabad skyline, Faisal
   Mosque, the Margalla Hills, or a Pakistani civic streetscape.
   Recommended: 2400×1200 or larger, JPEG/WebP, under 400 KB after compression.
2. Set the environment variable:

   ```
   NEXT_PUBLIC_HERO_IMAGE=/images/hero-islamabad.jpg
   ```

3. Restart the dev server / rebuild.

The dark overlay defined in `app/globals.css` (`.landing-hero::after`, `.auth-visual::after`,
`.gov-hero::after`) keeps headline and body text readable over either backdrop, so no
per-image tuning is required.

Imagery is used only on the landing hero, the authentication side panel, and the
government overview header. Operational tables, forms and maps stay image-free.
