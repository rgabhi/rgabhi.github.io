# Machine learning notes

The public learning index is `machine-learning.html`, linked from the portfolio's Writing section. The available chapters are `cnn-foundations.html`, `cnn-training.html`, `probability-gaussians.html`, and `statistical-regression-gda.html`, with links between adjacent chapters and the index.

These are ordinary static pages. GitHub Pages can serve them without a build step. For a local preview, run the existing `serve.py` from the repository root, or use a static HTTP server bound to localhost.

## Extending the collection

1. Inspect all relevant source slides, including annotations. Check the preceding and following lectures before deciding chapter boundaries.
2. Preserve the source learning goals. Explain necessary prerequisites as they arise; expand omitted algebra and supply small worked calculations.
3. Use general topic titles rather than course or exam branding. Attribute sources in each chapter, distinguish supplementary extensions, and avoid copying source photographs or assessment questions.
4. Follow the existing article shell: shared fonts and `article-notes.css`, then the isolated extensions in `ml-notes.css`. Keep existing articles unchanged.
5. Put original diagrams in `assets/ml-notes/`. Give every figure descriptive alternative text, a caption, and a full-size link. Provide static explanations alongside interactive tools.
6. Use `\(...\)` and `\[...\]` delimiters for locally rendered mathematics. State notation, dimensions, conventions, and assumptions. Verify equations and numerical examples.
7. Add practice questions with hints and solutions in distinct disclosure blocks. `data-solution` marks an answer for the chapter's reveal/print controls; `data-hint` marks a hint that remains closed when answers are revealed.
8. Update the learning index when the new chapter is ready. Pending topics remain text, not empty links. Add meaningful links between model chapters and probability, statistics, algebra, and calculus notes as those notes are completed.
9. Verify links, anchors, equation rendering, calculations, mobile layout, and printing. Include a review of keyboard-accessible interactions and any saved reading state.

## Assets and behavior

- `assets/ml-notes.css`: ML-specific layout, diagram, calculator, practice, and print styles.
- `assets/ml-notes.js`: mathematical rendering, answer controls, printing, local reading/checklist state, convolution explorer, and shape calculator.
- `assets/ml-training.js`: dropout masks/scaling and batch-normalization training/inference workbenches, used only by the training chapter.
- `assets/ml-probability.js`: joint-table probabilities and Gaussian covariance/conditioning workbenches, used only by the probability chapter. Charts scroll within their own region on small screens.
- `assets/ml-regression.js` and `assets/ml-regression.css`: regression estimation and Gaussian classification workbenches, plus chapter-specific table/chart layout. The classifier's separate-variance and decision-threshold controls are marked as extensions.
- `assets/vendor/katex/`: KaTeX 0.19.1 browser files, fonts, and MIT license. They are bundled so equation rendering does not require a third-party network request.
- Shared article fonts and the existing palette/navigation behavior are reused from the portfolio.

Reading state stays in browser local storage where available. It is optional and does not sync to a server. The explanatory HTML remains readable if scripting or storage is unavailable; the interactive calculators require JavaScript.

## Numerical validation

From the repository root, run `python3 tools/verify_ml_training.py`. It uses only the Python standard library. The checks compare analytic convolution/BN derivatives with central finite differences, enumerate dropout masks to verify expectations and variances, and verify worked examples and overlapping pooling. The script deliberately recomputes training BN statistics during perturbations and holds dropout masks fixed when differentiating.

Run `python3 tools/verify_ml_probability.py` for the probability chapter. It also uses only the standard library. Deterministic sums and quadrature verify distribution moments, Gaussian normalization and conditional slices, affine moments, block residual covariance, canonical parameters, ellipse geometry, and products versus convolution of densities. Numerical checks support the derivations; they are not proofs of all possible cases.

Run `python3 tools/verify_ml_regression.py` for regression and GDA. The standard-library checks compare analytic likelihood derivatives with finite differences, independently fit joint/conditional regression, enumerate noise to verify residual degrees of freedom, check pooled versus total covariance, and compare discriminant scores with normalized densities. Singular cases and prior/threshold effects are checked explicitly.
