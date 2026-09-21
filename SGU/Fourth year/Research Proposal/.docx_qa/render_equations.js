"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");

const outDir = path.join(__dirname, "equations");
fs.mkdirSync(outDir, { recursive: true });

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
const svgOutput = new SVG({ fontCache: "local" });
const doc = mathjax.document("", { InputJax: tex, OutputJax: svgOutput });

const equations = {
  "eq_5_1.png": String.raw`\min F_1(X)=\sum_{i\in D}\sum_{j\in R}x_{ij}\,\mathrm{dist}(d_i,p_j)`,
  "eq_5_2.png": String.raw`q_i=\frac{n_i}{e_i},\quad \bar q=\frac{1}{|D^+|}\sum_{i\in D^+}q_i`,
  "eq_5_3.png": String.raw`\min F_2(X)=\sqrt{\frac{1}{|D^+|}\sum_{i\in D^+}(q_i-\bar q)^2}`,
  "eq_5_4.png": String.raw`\min\bigl(F_1(X),F_2(X)\bigr)`,
  "eq_5_5.png": String.raw`\sum_{i\in D}x_{ij}\le 1,\quad \forall j\in R`,
  "eq_5_6.png": String.raw`\sum_{j\in R}x_{ij}\le 1,\quad \forall i\in D`,
  "eq_5_7.png": String.raw`x_{ij}=1\Rightarrow t_j^{\mathrm{req}}+t_{ij}^{\mathrm{pickup}}\le t_j^{\max}`,
  "eq_5_8.png": String.raw`X^{(a)}\prec X^{(b)}\Longleftrightarrow \bigl[\forall k,\ F_k(X^{(a)})\le F_k(X^{(b)})\bigr]\land\bigl[\exists k,\ F_k(X^{(a)})<F_k(X^{(b)})\bigr]`,
  "eq_5_9.png": String.raw`CD(i)=\sum_{k=1}^{2}\frac{F_k(i+1)-F_k(i-1)}{F_k^{\max}-F_k^{\min}}`,
  "eq_6_1.png": String.raw`t_{\mathrm{compute}}<\Delta T`
};

async function makePng(name, latex) {
  const html = adaptor.outerHTML(doc.convert(latex, { display: true }));
  const start = html.indexOf("<svg");
  const end = html.indexOf("</svg>");
  let svg = html.slice(start, end + 6).replace(/currentColor/g, "#000000");
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  await sharp(Buffer.from(svg), { density: 300 })
    .trim({ background: "#ffffff00" })
    .png()
    .toFile(path.join(outDir, name));
}

Promise.all(Object.entries(equations).map(([name, latex]) => makePng(name, latex)))
  .catch((error) => {
    process.stderr.write(String(error));
    process.exit(1);
  });
