# sentinel2-forest-ml-benchmark

Code and demo data for:

> Essbiti, M. C., et al. (2026). Benchmarking Ten Machine-Learning Algorithms for
> Mediterranean Forest Mapping with Sentinel-2. *Remote Sensing*. DOI: <paper DOI>

Archived version of this repository: <Zenodo DOI>

## Contents

```
gee/          Google Earth Engine scripts (JavaScript, run in the Code Editor)
python/       Analysis notebooks, numbered in the order of the paper's methodology
data/demo/    Demo training samples and study-area boundary (GeoJSON)
```

## Workflow

1. **Google Earth Engine** (`gee/`): Sentinel-2 median composite of the study area
   (Béni Mellal–Khénifra, Morocco). Open each script in the
   [Earth Engine Code Editor](https://code.earthengine.google.com/) and run it.
   You need an Earth Engine account linked to a Google Cloud project.
2. **Python** (`python/`): predictor screening, tuning and evaluation of ten classifiers,
   accuracy assessment, maps and comparison with Hansen Global Forest Change.
   Run the notebooks in order (00 → 13); see [`python/README.md`](python/README.md).
   Each notebook starts with a configuration cell where you set `DATA_DIR` and `RESULTS_DIR`.

## Demo data

The reference samples used in the paper are not shared. To let you run the workflow,
the repository provides **demo samples** (815 points in five classes: water, forest,
bare ground, urban, crops/grass) and the study-area boundary:

- as public Earth Engine assets (loaded directly by the GEE scripts):
  - `projects/mapping-forest-degradation/assets/Zenodo_demo/P2_demo_samples`
  - `projects/mapping-forest-degradation/assets/Paper3/Finished_Product/A01_Study_Area`
- as GeoJSON files in `data/demo/`

Results obtained with the demo samples **will differ from those reported in the paper**.

## Requirements

- Google Earth Engine account (for `gee/`)
- Python 3.13 with scikit-learn 1.6.1, XGBoost 3.4.1, CatBoost 1.2.10, SHAP 0.52.0,
  NumPy, pandas, rasterio, geopandas, esda and libpysal
  (exact versions in `python/00_environment_versions.ipynb`)
- The notebooks also run on Google Colab.

## Citation

If you use this code, please cite the paper above and the archived code (Zenodo DOI).

## License

Code: MIT License (see `LICENSE`).
