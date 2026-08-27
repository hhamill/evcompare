// The dataset's wrapper metadata and disclaimer text, in one place.
//
// Two files publish this: scripts/prerender.mjs writes dist/data/evs.json, and
// scripts/sync-urls.mjs writes the copy committed to the repo. They must agree — someone
// taking the file from GitHub should get the same licence, terms and pointers as someone
// downloading it from the site — and three hand-maintained copies of a paragraph is how
// that stops being true.
export const SITE = "https://evcompare.org";

export const DISCLAIMER_TEXT =
  "Provided as is, without warranty of any kind. Compiled by hand from manufacturer "
  + "specifications, EPA listings and published reviews; it may contain errors or omissions, and "
  + "figures correct when verified may since have changed. Verify against the manufacturer before "
  + "relying on any value. No liability is accepted for any use of this data.";

export const WARRANTY_HTML = `<p><strong>This data is provided as is.</strong> It is compiled by hand from manufacturer
      specifications, EPA listings and published reviews, and may contain errors or omissions.
      Figures that were correct when verified may since have changed — manufacturers revise
      specifications, and EPA ratings are re-certified. Every vehicle carries its own source
      links and a last-verified date so you can check the trail yourself.</p>
    <p>It is offered without warranty of any kind, express or implied, including fitness for a
      particular purpose. Verify any figure against the manufacturer before relying on it,
      particularly for a purchase decision. No liability is accepted for any use of this data.
      (CC0 itself disclaims warranties in the same terms; this just says so plainly.)</p>`;

// The wrapper around `models`. `generatedAt` is publish-only: it means nothing in the
// committed file (git already records when it changed) and including it would churn the repo
// on every sync. Everything else is identical in both copies, deliberately.
export function datasetWrapper({ hash, count, generatedAt = null }) {
  return {
    hash,
    license: "CC0-1.0",
    attribution: `EV Compare (evcompare.org) — appreciated, not required`,
    disclaimer: DISCLAIMER_TEXT,
    terms: `${SITE}/terms/`,
    url: SITE,
    datasetPage: `${SITE}/data/`,
    documentation: `${SITE}/data/SCHEMA.md`,
    ...(generatedAt ? { generatedAt } : {}),
    count,
  };
}
