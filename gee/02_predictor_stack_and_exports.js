/*  Paper 2 – Sentinel-2 forest mapping, Béni Mellal–Khénifra (Morocco)
 *  Script 02: predictor stack (56 candidates), sample table, Hansen layers and map stack
 *  Author: Mohamed Chikh Essbiti, Sultan Moulay Slimane University
 *  Paper: Remote Sensing (2026), DOI to be added   Code: https://github.com/essbiti/sentinel2-forest-ml-benchmark   Archive: https://doi.org/10.5281/zenodo.23770233
 *  Requires: a Google Earth Engine account linked to a Cloud project.
 *
 *  Exports (Tasks tab -> Run), all to the Google Drive folder P2_data:
 *    S2_Features_For_Correlation_v3.csv  predictor values at the samples      -> python steps 02-09
 *    P2_hansen_10m.tif                   Hansen GFC layers on the 10 m grid   -> python steps 11-13
 *    P2_stack_10m_part1..6.tif           16 selected predictors, for mapping  -> map prediction, step 10
 *  Put the downloaded files in the DATA_DIR folder used by the notebooks.
 *
 *  This script uses the public DEMO samples, so the outputs differ from those in the paper.
 *  The paper's reference samples (n = 2,800) are not shared.
 */

// ---------------- INPUTS ----------------
// Demo training samples (n = 815) with a 'class' property: for testing the workflow only
var samples = ee.FeatureCollection('projects/mapping-forest-degradation/assets/Zenodo_demo/P2_demo_samples');
// Study area: Béni Mellal–Khénifra region
var roi = ee.FeatureCollection('projects/mapping-forest-degradation/assets/Paper3/Finished_Product/A01_Study_Area');
var roiGeom = roi.geometry();

// ---------------- SETTINGS ----------------
var CRS   = 'EPSG:32629';                 // one fixed metric grid (WGS 84 / UTM 29N)
var SCALE = 10;
var PROJ  = ee.Projection(CRS).atScale(SCALE);
var OUT_FOLDER = 'P2_data';               // Google Drive folder for all exports

// GLCM window SIDE lengths in pixels (side = 2*size + 1): glcmTexture size 3 -> 7x7, size 5 -> 11x11
var SIDES = [7, 11];

var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];

// ---------------- SENTINEL-2 COMPOSITE (2025) ----------------
var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate('2025-01-01', '2026-01-01')          // end date is exclusive
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .select(bands);

print('Scenes in composite:', col.size());
print('First acquisition:', ee.Date(col.aggregate_min('system:time_start')));
print('Last acquisition:',  ee.Date(col.aggregate_max('system:time_start')));
print('Valid observations per pixel (min / max / mean):',
  col.select('B4').count().reduceRegion({
    reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
    geometry: roiGeom, scale: 100, bestEffort: true, maxPixels: 1e9
  }));

var s2 = col.median()
  .divide(10000)                                    // surface reflectance 0-1
  .clip(roi);

Map.centerObject(roi, 8);

// ---------------- TERRAIN ----------------
// Slope is computed on the unclipped DEM to avoid edge artefacts at the study-area border
var dem = ee.Image('USGS/SRTMGL1_003');
var elevation10 = dem.rename('elevation')
  .resample('bilinear').reproject(PROJ).clip(roi);
var slope10 = ee.Terrain.slope(dem).rename('slope')
  .resample('bilinear').reproject(PROJ).clip(roi);

// ---------------- SPECTRAL INDICES (14) ----------------
var ndvi   = s2.normalizedDifference(['B8','B4']).rename('NDVI');
var ndgr   = s2.normalizedDifference(['B4','B3']).rename('NDGR');    // (Red - Green)/(Red + Green)
var gndvi  = s2.normalizedDifference(['B8','B3']).rename('GNDVI');   // = -NDWI (algebraic duplicate)
var ndmi   = s2.normalizedDifference(['B8','B11']).rename('NDMI');
var ndre   = s2.normalizedDifference(['B8','B5']).rename('NDRE');
var rendvi = s2.normalizedDifference(['B6','B5']).rename('RENDVI');  // red-edge NDVI (740/705 nm)
var ndwi   = s2.normalizedDifference(['B3','B8']).rename('NDWI');
var ndbi   = s2.normalizedDifference(['B11','B8']).rename('NDBI');   // = -NDMI (algebraic duplicate)
var ui     = s2.normalizedDifference(['B12','B8']).rename('UI');     // (SWIR2 - NIR)/(SWIR2 + NIR)

var evi = s2.expression(
  '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))',
  {NIR: s2.select('B8'), RED: s2.select('B4'), BLUE: s2.select('B2')}
).rename('EVI');

var satvi = s2.expression(
  '((SWIR1 - RED) / (SWIR1 + RED + 0.5)) * 1.5 - (SWIR2 / 2)',
  {SWIR1: s2.select('B11'), RED: s2.select('B4'), SWIR2: s2.select('B12')}
).rename('SATVI');

var savi = s2.expression(
  '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
  {NIR: s2.select('B8'), RED: s2.select('B4')}
).rename('SAVI');

var bsi = s2.expression(
  '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))',
  {SWIR: s2.select('B11'), RED: s2.select('B4'),
   NIR: s2.select('B8'), BLUE: s2.select('B2')}
).rename('BSI');

var ibi = s2.expression(                            // band form of Xu (2008), bounded [-1, 1]
  '(2*S1/(S1+N) - (N/(N+R) + G/(G+S1))) / (2*S1/(S1+N) + (N/(N+R) + G/(G+S1)))',
  {S1: s2.select('B11'), N: s2.select('B8'), R: s2.select('B4'), G: s2.select('B3')}
).rename('IBI');

var indices = ee.Image.cat([rendvi, ndwi, ndgr, ndvi, gndvi, ndmi, ndre,
                            evi, satvi, bsi, ui, ibi, ndbi, savi]);

// ---------------- GLCM TEXTURES ON NDVI (15 metrics x 2 windows = 30) ----------------
// NDVI is fixed to the 10 m UTM grid before the neighbourhood operation,
// so texture values do not depend on the output projection or zoom level.
var ndviInt = ndvi.multiply(100).add(100).toInt().reproject(PROJ);

// In glcmTexture, 'size' is the neighbourhood radius (side = 2*size + 1); the default
// kernel (1-pixel offsets in 4 directions, averaged) defines the co-occurrence offsets.
var texNames = ['NDVI_contrast','NDVI_corr','NDVI_ent','NDVI_idm','NDVI_savg',
                'NDVI_svar','NDVI_dent','NDVI_imcorr1','NDVI_imcorr2','NDVI_inertia',
                'NDVI_prom','NDVI_shade','NDVI_diss','NDVI_dvar','NDVI_var'];

function glcmWindow(side) {
  var suffix = '_' + side + 'x' + side;
  return ndviInt.glcmTexture({size: (side - 1) / 2})
    .select(texNames, texNames.map(function (n) { return n + suffix; }));
}
var tSmall = glcmWindow(SIDES[0]);
var tLarge = glcmWindow(SIDES[1]);

// ---------------- FULL PREDICTOR STACK ----------------
// 10 bands + 14 indices + 30 textures + elevation + slope = 56
var featureImage = s2.addBands(indices)
  .addBands(tSmall)
  .addBands(tLarge)
  .addBands(elevation10)
  .addBands(slope10);

// ---------------- 1. SAMPLE TABLE ----------------
var trainingTable = featureImage.sampleRegions({
  collection: samples,
  properties: ['class'],
  projection: PROJ,                                 // same grid as the map export
  scale: SCALE,
  geometries: true
});

trainingTable = trainingTable.map(function (f) {
  var c = f.geometry().coordinates();
  return f.set('longitude', c.get(0), 'latitude', c.get(1));
});

// File name kept so that the Python notebooks read it without changes
Export.table.toDrive({
  collection: trainingTable,
  description: 'S2_Features_For_Correlation_v3',
  folder: OUT_FOLDER,
  fileFormat: 'CSV'
});

// ---------------- 2. HANSEN LAYERS ON THE SAME 10 m GRID ----------------
// Hansen Global Forest Change v1.12 (2000-2024)
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var hansen = gfc.select(['treecover2000', 'lossyear', 'gain', 'datamask'])
  .toUint8().clip(roiGeom).unmask(255);             // 255 = outside the study area

Export.image.toDrive({
  image: hansen,
  description: 'P2_hansen_10m',
  folder: OUT_FOLDER,
  region: roiGeom,
  crs: CRS,
  crsTransform: [10, 0, 0, 0, -10, 0],              // identical grid to the predictor stack
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});

// ---------------- 3. MAP STACK OF THE 16 SELECTED PREDICTORS, IN 6 PARTS ----------------
// The 16 predictors retained by the screening (python step 03), in the order the models expect
var PREDICTORS = ['slope', 'elevation', 'NDWI', 'SATVI', 'NDGR', 'B8A', 'B2',
  'NDVI_idm_7x7', 'NDVI_svar_7x7', 'NDVI_corr_7x7', 'NDVI_shade_7x7', 'NDVI_prom_7x7',
  'NDVI_diss_11x11', 'NDVI_imcorr2_11x11', 'NDVI_corr_11x11', 'NDVI_shade_11x11'];

var OUT_SCALE = 10;     // 10 = full resolution; 30 = centre-pixel sample (9x smaller files)
var NX = 3, NY = 2;     // 3 columns x 2 rows = 6 parts

var stackOut = featureImage.select(PREDICTORS).toFloat();
if (OUT_SCALE !== SCALE) { stackOut = stackOut.reproject(PROJ); }   // keep 10 m values, sample centres
stackOut = stackOut.clip(roiGeom).unmask(-9999);

// Bounding box in UTM metres, split into parts whose edges fall on the 30 m grid
var ring = roiGeom.bounds(1, ee.Projection(CRS)).coordinates().get(0).getInfo();
var xs = ring.map(function (p) { return p[0]; }), ys = ring.map(function (p) { return p[1]; });
var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
function snap(v) { return Math.round(v / 30) * 30; }

for (var i = 0; i < NX; i++) {
  for (var j = 0; j < NY; j++) {
    var part = ee.Geometry.Rectangle({
      coords: [snap(x0 + i * (x1 - x0) / NX), snap(y0 + j * (y1 - y0) / NY),
               snap(x0 + (i + 1) * (x1 - x0) / NX), snap(y0 + (j + 1) * (y1 - y0) / NY)],
      proj: CRS, geodesic: false});
    Export.image.toDrive({
      image: stackOut,
      description: 'P2_stack_' + OUT_SCALE + 'm_part' + (i * NY + j + 1),
      folder: OUT_FOLDER, region: part, crs: CRS,
      crsTransform: [OUT_SCALE, 0, 0, 0, -OUT_SCALE, 0],   // same grid in every part
      maxPixels: 1e13, fileFormat: 'GeoTIFF'
    });
  }
}

// ---------------- CHECKS ----------------
print('Number of predictors:', featureImage.bandNames().size());   // expect 56
print('Feature image bands:', featureImage.bandNames());
print('Number of samples:', trainingTable.size());                 // 815 with the demo samples (2,800 in the paper)
print('First sample:', trainingTable.first());
