// `leaflet.heat` não publica tipos. Import de efeito colateral: adiciona
// `L.heatLayer` ao namespace do Leaflet (consumido via cast `as any`).
declare module "leaflet.heat";
