// Imports de efeito colateral de CSS de terceiros (ex.: `leaflet/dist/leaflet.css`,
// `react-easy-crop/react-easy-crop.css`). O Next injeta o CSS no bundle em runtime,
// mas o TypeScript não resolve o `.css` como módulo → erro TS2882. Esta declaração
// ambiente tipa qualquer import `*.css` como side-effect (sem exports).
//
// Mais específica (`*.module.css`, tipada pelo Next como objeto de classes) tem
// precedência, então CSS Modules continuam com os tipos corretos.
declare module "*.css";
