/*  Paper 2 – Sentinel-2 forest mapping, Béni Mellal–Khénifra (Morocco)
 *  Script P2_01: Sentinel-2 median composite of the study area (2025)
 *  Author: Mohamed Chikh Essbiti, Sultan Moulay Slimane University
 *  Paper: <citation / DOI when published>   Code: https://github.com/essbiti/sentinel2-forest-ml-benchmark  Archive: <Zenodo DOI>
 *  Requires: a Google Earth Engine account linked to a Cloud project.
 *  The demo samples and the study area are public assets; the paper's reference data are not shared.
 */

// Demo training samples (n = 815): for testing the workflow only, NOT the reference data used in the paper
var samples = ee.FeatureCollection('projects/mapping-forest-degradation/assets/Zenodo_demo/P2_demo_samples');

// Study area: Béni Mellal–Khénifra region
var roi = ee.FeatureCollection('projects/mapping-forest-degradation/assets/Paper3/Finished_Product/A01_Study_Area');

print('Demo samples per class:', samples.aggregate_histogram('class'));

// 1. Define bands (fixed order)
var bands = [
  'B2', 'B3', 'B4', 'B8',   // 10 m bands
  'B5', 'B6', 'B7', 'B8A',  // Red Edge
  'B11', 'B12'              // SWIR
];

// 2. Sentinel-2 median composite, 2025
var image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2025-01-01', '2026-01-01')               // end date is exclusive
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .filterBounds(roi)
  .select(bands)   // keep these 10 bands in this order: the classifier expects them
  .median()
  .clip(roi);

// 3. Display
var visParamsFalseColor = {
  bands: ['B8', 'B4', 'B3'],   // false colour (NIR, red, green): vegetation appears red
  min: 0,
  max: 2500,
  gamma: 1.1
};

Map.centerObject(roi, 8);
Map.addLayer(image, visParamsFalseColor, 'S2 composite 2025 (false colour)');
Map.addLayer(samples, {color: 'yellow'}, 'Demo samples');

// 4. Optional: export the composite to your own Earth Engine project
//Export.image.toAsset({
//  image: image,
//  description: 'Export_S2_2025_Composite',
//  assetId: 'projects/<your-cloud-project>/assets/S2_2025_composite',
//  region: roi,
//  scale: 10,
//  maxPixels: 1e13
//});
