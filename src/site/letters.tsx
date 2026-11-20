// Splits text into masked graphemes for the rise reveals (MOTION.md §2.6). Grapheme-safe (Intl.Segmenter) so
// Urdu can come later. Words stay unbroken; the readable copy lives in a visually hidden twin.
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });

export function Letters({ text, by = "letter" }: { text: string; by?: "letter" | "word" }) {
  const words = text.split(" ");
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            <span className="nowrap">
              {by === "word" ? (
                <span className="mask"><span data-l>{word}</span></span>
              ) : (
                [...seg.segment(word)].map(({ segment }, i) => (
                  <span className="mask" key={i}><span data-l>{segment}</span></span>
                ))
              )}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </>
  );
}
