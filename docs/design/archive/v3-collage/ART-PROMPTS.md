# FingerPay art prompts (Google Flow / Higgsfield)

These prompts make the illustrated vignettes for the FingerPay landing page. Each section of the page gets one short looping scene. Real text, numbers and app screens are added in code, never generated.

## Cast v2: modern Pakistani cast (user decision, 2026-11-19) — use this, not the period figures below

The old European engraved figures are replaced by present-day people. They match the demo personas (Rasheed Ahmed, Ayesha Khan, Bilal Hussain), who are Pakistani, so the cast is brown-skinned South Asian. The collage look stays: hand-inked, watercolour-tinted figures cut out like paper.

**Drop-in rule:** every file below replaces the file of the same name in `public/art/`. Keep the name, export a **transparent-background PNG or WebP**, full body, feet touching the bottom edge, about **900 px tall**, and keep the white paper cut-out border. The page picks the new art up with no code change.

**Style block v2 (paste at the start of every cast prompt):**
```
A hand-inked illustration with fine black pen linework and light cross-hatching, tinted with soft watercolour washes, of a present-day person from Lahore, Pakistan, with brown skin and natural South Asian features, wearing everyday modern clothes. Realistic, warm and dignified, full length, three-quarter view. Muted colours: olive green, turmeric, indigo, chai brown, cream. The figure is cut out like a paper collage piece, with a thin uneven white paper border and a soft short shadow, isolated on a plain flat white background. Not cartoon, not anime, not 3D, no big eyes, no glossy rendering. No text, no letters, no numbers, no logos, no religious symbols.
```

| File | Who and pose |
|---|---|
| `grocer-wait.webp` | **Rasheed**, mid-40s shopkeeper, neatly trimmed black beard with some grey, reading glasses pushed up on his head, olive-green shalwar kameez with sleeves rolled to the elbow, a pen in the chest pocket. Standing three-quarter view, both hands resting forward as if on a counter, friendly and attentive. |
| `grocer-lean.webp` | **Rasheed**, identical person and clothes. Looking down at a smartphone held in his right hand at chest height, checking it, a small pleased half-smile. |
| `grocer-stand.webp` | **Rasheed**, identical person and clothes. Standing relaxed in profile, arms loosely at his sides. |
| `lady-tap.webp` | **Ayesha**, late-20s office worker, shoulder-length dark hair, a tarp-blue cotton kurta over straight trousers, a chai-brown dupatta over one shoulder, a canvas tote with bread and milk on her left arm. Profile facing right, right arm stretched forward with the thumb extended as if pressing a scanner. Empty-handed apart from the tote: no phone, no wallet. |
| `lady-idle.webp` | **Ayesha**, identical person and clothes. Standing three-quarter view, tote on her arm, a small satisfied smile, as if she has just paid. |
| `student.webp` | **Bilal**, around 20, messy black hair, a turmeric-yellow hoodie over a white kurta, jeans, worn sneakers, a backpack on one shoulder. Standing three-quarter view reading an old basic keypad phone held in his right hand. |

Generate 4–8 options of each, pick the one that matches the others best, and use it as the reference image for the remaining poses of that person so the face and clothes stay identical.

---

## How to use these

1. **Make the character sheets first (section 2) and pick the best one of each.** Save them. From then on, attach the sheet as the reference image in every prompt that character appears in. This is what keeps faces, clothes and proportions the same across scenes.
2. For each scene, generate the **key frame image** first. When it looks right, use it as the start frame for the **video loop**.
3. Paste the **style block** (section 1) at the start of every prompt, word for word. Don't edit it between prompts.
4. Send me back:
   - the videos as MP4, 1920×1080 (16:9) or 1080×1080 where marked, 6–8 s each
   - the chosen key frames as PNG
   I'll turn them into 12 fps frame sequences, cut out the backgrounds and optimise them for the site.

**Settings:**
- Camera locked, with no camera movement (the page moves, not the camera).
- 24 fps output is fine; I'll take every second frame to get 12 fps.
- Ask for a seamless loop, where the first and last frame match.

**Reject a generation if:**
- any character's face, beard, clothes or proportions differ from the sheet
- it has letters or words (generators garble them)
- it has logos, brand names, flags or religious symbols
- it looks like flat cartoon or vector art, the shading turns glossy or 3D, the paper cut-out border is missing, or it picks up lens blur or bloom
- a hand has extra fingers
- the background isn't flat

---

## 1. Style block (paste at the start of every prompt)

```
An antique European hand-coloured engraving from the 1600s–1800s, like a plate from an old costume book or a Georgian or Victorian print: fine black etched linework with cross-hatching, tinted by hand with soft watercolour washes, on aged cream paper with light foxing. Realistic, dignified figures in period dress, shown full length, in profile or three-quarter view, as in a museum print collection. Faded, muted colours: bottle green, brick red, ochre, indigo, sepia, cream. The figure is cut out like a paper collage piece, with a thin uneven paper edge and a soft short shadow, isolated on a plain flat white background. Not cartoon, not anime, not modern digital painting, no big eyes, no glossy 3D, no neon. No text, no letters, no numbers, no logos, no borders or frames.
```

**Modern objects** (scanner, phones) are drawn in the same old engraving technique. An old engraved figure holding a modern phone is the joke and the point of the collage.

**Tip:** attach one real public-domain engraving as a **style reference image**. The Met (Open Access), the Rijksmuseum, the British Library and Wikimedia Commons have thousands, free to use. Search "hand-coloured costume engraving" or "18th century tradesman print". You can also use real prints from those archives directly as characters.

**Scene backgrounds** (only for full-width bands, never behind characters) use this instead, on their own:
```
Loose watercolour painting on textured off-white paper, soft washes with uneven edges fading into the white paper, muted earthy palette (faded blue, ochre, bottle green, sepia), painterly and atmospheric, no people, no text.
```

## 2. Character and prop sheets (make these first)

Ask for 1:1 or 16:9 images, and generate 4–8 options of each.

**2a. The shopkeeper (merchant side)**
```
[STYLE BLOCK] One figure shown three times side by side, identical person and costume: a Georgian-era grocer around 50, grey side-whiskers, spectacles on his nose, a bottle-green waistcoat over a white shirt with rolled sleeves, a long cream apron, a quill tucked behind one ear. Poses: standing in profile behind nothing, three-quarter view with hands resting forward as if on a counter, and a polite bow.
```

**2b. The shopper**
```
[STYLE BLOCK] One figure shown three times side by side, identical person and costume: a Victorian lady around 35, hair pinned up under a small hat, an indigo day dress with a cream lace collar, a wicker shopping basket with a loaf of bread. Poses: walking in profile, three-quarter view raising her right hand with the thumb extended, and a small satisfied nod.
```

**2c. The student**
```
[STYLE BLOCK] One figure shown three times side by side, identical person and costume: a young 18th-century scholar around 20, untidy hair tied back, an ochre coat over a white shirt, a satchel of books, holding a small modern keypad mobile phone engraved in the same old style. Poses: walking in profile, reading the phone, and a pleased tip of his hat.
```

Use profile and three-quarter views only, as in the old prints. They read well and avoid strange front-facing faces. The website animates these as paper puppets (pieces slide, sway, nod), so 2–3 poses per figure are enough.

**2d. Props**
```
[STYLE BLOCK] Prop sheet, each object isolated and evenly spaced: (1) a small flat fingerprint scanner pad on a slim stand, matte near-black, with a softly lit oval sensor; (2) a smartphone on a counter stand showing a blank screen; (3) a wooden shop counter front view with a glass jar of sweets and a stack of bread loaves; (4) a carton of milk and a loaf of bread; (5) a small shelf of bright packaged groceries with no readable labels; (6) an old keypad mobile phone, front view, screen blank.
```

---

## 3. Section vignettes

Each scene has a key frame prompt, then a video prompt. Attach the character sheets they use.

### Hero: "the one-tap moment" (16:9)
**Key frame:**
```
[STYLE BLOCK] Medium shot at an old wooden shop counter. the shopkeeper stands behind the wooden counter on the right, the scanner pad and the phone-on-stand in front of him. the shopper stands on the left, a loaf of bread and a carton of milk on the counter, her right thumb just touching the scanner pad. No wallet, no phone, no cash anywhere. Calm, warm moment. Characters fill the middle of the frame, generous empty white space above for a headline.
```
**Video loop (6 s, seamless):**
```
[STYLE BLOCK] Locked camera, no camera movement. the shopper lifts her right thumb and presses it on the scanner pad; the oval sensor glows softly once; the shopkeeper glances at his phone on the stand, then gives a small pleased nod; the shopper picks up the bread and milk and smiles. The pose then eases back to the start for a seamless loop. Hand-drawn animation timing, holds on the key poses, no motion blur.
```

### Problem: "what checkout looks like today" (16:9; three short loops)
**3a. Cash and no change:**
```
[STYLE BLOCK] Locked camera. The shopkeeper behind the counter searches an open cash drawer, shaking his head; one crumpled note on the counter. Seamless 4 s loop, slight exasperated shrug on the hold.
```
**3b. The transfer screenshot:**
```
[STYLE BLOCK] Locked camera. A customer's hand holds a smartphone toward the shopkeeper, who leans in squinting through his reading glasses, unsure. The phone screen is a blank glowing rectangle with no text. Seamless 4 s loop.
```
**3c. No phone, no card:**
```
[STYLE BLOCK] Locked camera. The student pats his pockets, finds only his old keypad phone, looks at it and gives an awkward smile. Seamless 4 s loop.
```

### How it works: four steps (1:1 each; each loop 4 s, seamless)
1. `[STYLE BLOCK] Locked camera, close-up on the shopkeeper's hand tapping numbers on the phone-on-stand; the screen is a blank glowing rectangle. Seamless loop.`
2. `[STYLE BLOCK] Locked camera, close-up of a right thumb pressing the scanner pad; the oval sensor glows once, gently. Seamless loop.`
3. `[STYLE BLOCK] Locked camera, close-up of the scanner pad and phone; a small soft circular pulse travels from the pad to the phone, like a check passing. Abstract, minimal. Seamless loop.`
4. `[STYLE BLOCK] Locked camera, medium close-up of the shopkeeper smiling at his phone while, in the corner, a hand holding a keypad phone feels it buzz once. Seamless loop.`

### For shops: the merchant app as proof (16:9)
Leave the phone screen **blank**; the real app UI is placed on it in code.
```
[STYLE BLOCK] Locked camera. The shopkeeper at closing time, sitting on a stool behind the counter, holding the phone at a comfortable reading angle, relaxed, scrolling with his thumb, a cup of tea beside him. The phone screen faces the viewer straight on, flat and square to the camera with no perspective tilt, and is a plain flat white rectangle (it will be replaced). Seamless 6 s loop: small scroll gesture, a sip of tea, a satisfied exhale.
```

### Safety: "lock your thumb with one word" (16:9)
```
[STYLE BLOCK] Locked camera. The shopper at a bus stop, typing on her phone with her thumb, then she holds up her right thumb and looks at it with a small confident smile, as if it is now safely locked. Nobody else in frame. Seamless 6 s loop.
```

### Every phone: the student and the SMS receipt (16:9)
```
[STYLE BLOCK] Locked camera. The student walking slowly out of the shop holding a bread loaf, his old keypad phone buzzes, he reads it, grins and gives a small thumbs-up to himself. The phone screen is a plain lit rectangle with no text. Seamless 6 s loop.
```

### Footer: sign-off (16:9)
```
[STYLE BLOCK] Locked camera, wide shot. The old shop counter at dusk, the shopkeeper closing the shop shutters, waving goodbye toward the viewer. Warm and quiet. Seamless 6 s loop.
```

---

## 4. Live interaction frames (key frames only, 1:1)

These become code-driven interactions (eyes following the cursor, the press-and-hold thumb).
Generate each pose as **its own 1080×1080 image**, not a grid. Small grid cells are too small for the site. Keep the same seed and reference image across the set, and change only the one detail named.
- **the shopkeeper's eyes (10 images):** `[STYLE BLOCK] Head close-up of the shopkeeper, front view, neutral expression, eyes drawn as simple shapes, looking [straight ahead | up | up-right | right | down-right | down | down-left | left | up-left], identical head, framing and lighting in every image.` Then one more with the eyes closed in a blink.
- **The thumb press (6 images):** `[STYLE BLOCK] Close-up of a right thumb and the scanner pad, identical framing in every image, stage: [hovering above the pad | just touching | pressed flat | sensor glowing softly | glow fading | thumb lifted away].`

## 5. Where the colours come from

The style reference is a paper cut-out collage site (the user's recording, 2026-11-19): vintage hand-coloured figures cut out like paper, watercolour backgrounds, torn-paper labels. Take that technique and level of craft only, never its art or layout. The page itself is textured off-white paper, and the cut-outs sit on it with their paper border and shadow.

The palette is the faded colours of hand-coloured European prints: bottle green, brick red, ochre, indigo, sepia and cream. The UI colours in `docs/design/TYPE-AND-COLOR.md` must harmonise with it. Generators only roughly follow colours; I correct them when I process the frames.
