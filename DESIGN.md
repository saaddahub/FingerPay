# FingerPay landing redesign

**Version 5 · design handoff · 20 November 2026**

FingerPay is a student fintech prototype for paying by thumb at a shop counter. The new landing page follows one simulated payment from fingertip contact to the merchant’s confirmation. The signature moment is a 240-image sequence that moves into the actual Android terminal screen and resolves to **Settled.**

## Handoff for Claude Opus 5.5

Read these files in order before implementing.

1. [Creative direction and visual system](docs/design/landing-v5/DIRECTION.md)
2. [Page structure, copy, and checkout dialog](docs/design/landing-v5/PAGE.md)
3. [Motion and 240-frame sequence](docs/design/landing-v5/MOTION.md)
4. [Asset production, implementation, and acceptance](docs/design/landing-v5/BUILD.md)

[PRODUCT.md](PRODUCT.md) defines the audience and public claims. [SPEC.md](docs/SPEC.md) defines the product behavior and payment rules. This handoff defines the new landing page and a narrow Android refinement pass. The previous design documents under `docs/design/` describe the earlier landing direction.

## First decisions

- The first view pairs large black type and a useful action with a sunlit design showroom. A diagonal window shadow crosses a honed limestone counter and catches a small black reader.
- One film carries the biggest changes in scale. The camera starts with the sunlit room, follows the hand to the reader, then pushes into the terminal screen. A moment of stillness makes the result legible.
- The rest of the page keeps moving through purposeful transitions. The checkout opens as a glass dialog, the three checkout states share the same amount and surface, and the receipt unfolds into a readable record.
- The desktop and touch experiences both give the reader direct control. The complete story also reads as three stills and text.
- Capture the Android prototype with fictional data. Start with the capture and motion proof in [BUILD.md](docs/design/landing-v5/BUILD.md) before producing the frame sequence.
