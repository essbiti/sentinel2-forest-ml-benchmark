# Python notebooks

Analysis notebooks for *Benchmarking Ten Machine-Learning Algorithms for
Mediterranean Forest Mapping with Sentinel-2* (Remote Sensing, 2026).
The notebooks are numbered in the order of the paper's methodology. Run them in
that order: later steps read the outputs of earlier ones.

## Setup

The data are **not** included in this repository. Each notebook starts with a
title cell (step, paper section, inputs, outputs) and a configuration cell that
sets two folders:

| Variable      | Contents |
|---------------|----------|
| `DATA_DIR`    | input data: training-sample table (`S2_Features_For_Correlation_v3.csv`), GEE exports, classified map tiles (`maps/<model>/`), Hansen GFC raster on the 10 m grid |
| `RESULTS_DIR` | outputs written by the notebooks |

The defaults are `data/` and `results/`. On Google Colab, mount Google Drive and
point both variables to your Drive folder (an example is in the configuration cell).

## Workflow

| Step | Notebook | What it does | In the paper |
|---|---|---|---|
| 00 | `00_environment_versions` | Records Python and library versions | Section 2.5 |
| **Data** | | | |
| 01 | `01_composite_scene_quality` | Sentinel-2 scenes per MGRS tile; observations and clear share per pixel | 2.2.1 · Table S1, S1b, Figure S1 |
| 02 | `02_reference_samples_field_access` | Field-recorded vs. image-interpreted reference points (distance to OSM roads) | 2.2.3 |
| **Predictors and models** | | | |
| 03 | `03_predictor_screening` | Redundancy, \|r\| > 0.80 and VIF < 10 screening on the training partition only (56 → 16 predictors) | 2.3 · Table 1, Table S2 |
| 04 | `04_model_tuning_and_evaluation` | 70:30 stratified split; 5-fold GridSearchCV of ten classifiers; train / CV / test metrics; hyperparameters and hardware | 2.4–2.5 · Table 2, Table 4, Table S4 |
| **Accuracy assessment** | | | |
| 05 | `05_mcnemar_and_spatial_block_cv` | Paired McNemar tests (Holm); spatial block CV with 10 and 20 km blocks | 2.6, 3.2–3.3 · Tables 6–7, Figure 7, Tables S3, S5, Figure S3 |
| 06 | `06_learning_curves` | Learning curves within the training partition | 3.2 · Figure 6, Figure S4 |
| 07 | `07_class_errors` | Per-class errors, crops/grass vs. forest confusion | 3.2 · Table 5 |
| 08 | `08_spatial_autocorrelation_of_errors` | Moran's I and join counts of test errors | 2.6, 3.3 · Table 8, Figure 8 |
| 09 | `09_correlation_confusion_shap_figures` | Correlation matrices, confusion matrices, CatBoost SHAP | 3.1–3.4 · Figures 3–5, Table 3, Figure S2 |
| **Maps** | | | |
| 10 | `10_classified_map_figures` | Figures of the ten classified maps; agreement among models | 3.5 · Figures 11–12, Table 9 |
| **Comparison with Hansen Global Forest Change** | | | |
| 11 | `11_hansen_threshold_agreement` | Agreement at 10, 20, 30 and 50 % tree cover; Hansen gain and loss | 2.7, 3.7 · Table 11, Figure 14 |
| 12 | `12_hansen_agreement_map` | Map of CatBoost–Hansen agreement classes | 3.7 |
| 13 | `13_hansen_verification_sample` | Blind verification of CatBoost-only and Hansen-only pixels | 2.7, 3.7 · Table 12 |

Steps 05–10 need the outputs of step 04 (`RESULTS_DIR/train_test_gap/`).
Steps 10–13 also need the classified map tiles in `DATA_DIR/maps/<model>/`.

Software versions used for the published results: Python 3.13, scikit-learn 1.6.1,
XGBoost 3.4.1, CatBoost 1.2.10, SHAP 0.52.0, NumPy 2.1.3, pandas 2.2.3,
esda 2.9.0, libpysal 4.14.1.
