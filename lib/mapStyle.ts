import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

/**
 * 단순화한 실제 지도 스타일 (11/9 결정: 카카오맵 대신 MapLibre + OpenFreeMap).
 * 큰길·지하철·물·공원·큰 동네 이름만 남기고, 확대하면 골목길만 연하게 더한다. 건물·가게 이름은 그리지 않는다.
 * 지하철 노선·역은 OpenStreetMap에서 뽑아 public/map/*.geojson 으로 둔다 (노선별 색을 쓰기 위해).
 */
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:ko'], ['get', 'name']];
const MAJOR = ['motorway', 'trunk', 'primary', 'secondary'];
const FONT = ['Noto Sans Regular'];

export const MAP_ATTRIBUTION = '© OpenStreetMap · OpenMapTiles · OpenFreeMap';

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    subwayLines: { type: 'geojson', data: '/map/subway-lines.geojson' },
    subwayStations: { type: 'geojson', data: '/map/subway-stations.geojson' },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#EDF1EE' } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#CFE5C3' } },
    {
      id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]],
      paint: { 'fill-color': '#D8EBCD' },
    },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#BFDCEF' } },
    {
      id: 'minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 15,
      filter: ['in', ['get', 'class'], ['literal', ['tertiary', 'minor', 'service']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 17, 4],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.6, 1],
      },
    },
    {
      id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['all', ['==', ['get', 'class'], 'rail'], ['!=', ['get', 'brunnel'], 'tunnel']],
      paint: { 'line-color': '#B9C2BD', 'line-width': 2, 'line-dasharray': [3, 2] },
    },
    {
      id: 'road-case', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#CDD5D0', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 14, 6, 17, 16] },
    },
    {
      id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#FFFDF6', '#FFFFFF'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 4, 17, 13],
      },
    },
    {
      id: 'subway-case', type: 'line', source: 'subwayLines',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 9] },
    },
    {
      id: 'subway', type: 'line', source: 'subwayLines',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'c'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 5] },
    },
    {
      id: 'road-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13.5,
      filter: ['in', ['get', 'class'], ['literal', MAJOR]],
      layout: { 'symbol-placement': 'line', 'text-field': NAME, 'text-font': FONT, 'text-size': 10, 'text-letter-spacing': 0.1 },
      paint: { 'text-color': '#7B8580', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 },
    },
    {
      id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'waterway',
      filter: ['==', ['get', 'class'], 'river'],
      layout: { 'symbol-placement': 'line', 'text-field': NAME, 'text-font': FONT, 'text-size': 11 },
      paint: { 'text-color': '#4A86B0', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 },
    },
    {
      id: 'quarter', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 15,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter']]],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': 11 },
      paint: { 'text-color': '#9AA39F', 'text-halo-color': '#EDF1EE', 'text-halo-width': 1.5 },
    },
    {
      id: 'landmark', type: 'symbol', source: 'omt', 'source-layer': 'poi',
      filter: [
        'all',
        ['in', ['get', 'class'], ['literal', ['park', 'attraction', 'museum', 'place_of_worship', 'railway']]],
        ['<=', ['get', 'rank'], 3],
      ],
      layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': 10.5 },
      paint: { 'text-color': '#2F5130', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 },
    },
    {
      id: 'station-dot', type: 'circle', source: 'subwayStations',
      paint: { 'circle-radius': 4, 'circle-color': '#FFFFFF', 'circle-stroke-color': '#3B4541', 'circle-stroke-width': 2 },
    },
    {
      id: 'station-name', type: 'symbol', source: 'subwayStations',
      layout: { 'text-field': ['get', 'n'], 'text-font': FONT, 'text-size': 10, 'text-anchor': 'left', 'text-offset': [0.7, 0] },
      paint: { 'text-color': '#3B4541', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 },
    },
  ],
};

/** 앱이 그리는 레이어(구역 원, 코스 선)를 이 레이어 아래에 넣어 역 이름이 가려지지 않게 한다 */
export const OVERLAY_BEFORE = 'station-dot';
