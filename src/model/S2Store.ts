import { control, divIcon, featureGroup, geoJSON, marker } from 'leaflet';
import { IS2GeoJSON, IS2GeoJSONFeature } from '../@types/geojson';
import MapStore, { IS2CellCount } from './MapStore';

interface IS2LatLng {
	topleft: number[];
	topright: number[];
	bottomright: number[];
	bottomleft: number[];
	s2Cell: string;
}

class S2Store {
	public s2LatLngs: IS2LatLng[];
	public s2LocationCountLayer: any;
	public s2TotaRaidsLayer: any;
	public s2PolygonLayer: any;
	public s2LayerGroup: any;
	public s2CountsLayerGroup: any;
	public s2TotalsLayerGroup: any;

	constructor() {
		if (!process.env.REACT_APP_S2_L12_URL) {
			console.warn(
				'REACT_APP_S2_L12_URL not defined. S2 grid will not be available.'
			);
		}

		this.s2LocationCountLayer = featureGroup();
		this.s2TotaRaidsLayer = featureGroup();
		this.s2PolygonLayer = geoJSON();
		this.s2LayerGroup = featureGroup([this.s2PolygonLayer]);
		this.s2CountsLayerGroup = featureGroup();
		this.s2TotalsLayerGroup = featureGroup();

		async function init() {
			const response = await fetch(
				process.env.REACT_APP_S2_L12_URL || ''
			);

			const data: IS2GeoJSON = await response.json();

			return data;
		}

		init().then(data => {
			this.s2LatLngs = data.features.map(
				(feature: IS2GeoJSONFeature) => ({
					bottomleft: [
						feature.coordinates[0][0][1],
						feature.coordinates[0][0][0],
					],
					bottomright: [
						feature.coordinates[0][1][1],
						feature.coordinates[0][1][0],
					],
					s2Cell: feature.properties.order,
					topleft: [
						feature.coordinates[0][3][1],
						feature.coordinates[0][3][0],
					],
					topright: [
						feature.coordinates[0][2][1],
						feature.coordinates[0][2][0],
					],
				})
			);
			this.s2PolygonLayer.addData(data);

			control
				.layers(null, {
					'S2 cells L12 grid': this.s2LayerGroup,
					'Locations per cell (red)': this.s2CountsLayerGroup,
					'Total raids per cell (blue)': this.s2TotalsLayerGroup,
				})
				.addTo(MapStore.map);
		});
	}

	public overlayS2Labels = (s2CellCount: IS2CellCount) => {
		const s2Cells = featureGroup(
			this.s2LatLngs.map(({ s2Cell, topleft }) =>
				marker(
					{ lat: topleft[0], lng: topleft[1] },
					{
						icon: divIcon({
							className: 's2-label',
							html: s2CellCount[s2Cell] ? s2Cell : '',
						}),
					}
				)
			)
		);

		const counts = featureGroup(
			this.s2LatLngs.map(({ s2Cell, topright }) =>
				marker(
					{ lat: topright[0], lng: topright[1] },
					{
						icon: divIcon({
							className: 's2-label s2-count',
							html: s2CellCount[s2Cell]
								? String(s2CellCount[s2Cell].count)
								: '',
						}),
					}
				)
			)
		);

		const totals = featureGroup(
			this.s2LatLngs.map(({ s2Cell, bottomleft }) =>
				marker(
					{ lat: bottomleft[0], lng: bottomleft[1] },
					{
						icon: divIcon({
							className: 's2-label s2-total',
							html: s2CellCount[s2Cell]
								? String(s2CellCount[s2Cell].total)
								: '',
						}),
					}
				)
			)
		);

		this.s2LayerGroup.clearLayers();
		this.s2CountsLayerGroup.clearLayers();
		this.s2TotalsLayerGroup.clearLayers();
		this.s2LayerGroup.addLayer(this.s2PolygonLayer);
		this.s2LayerGroup.addLayer(s2Cells);
		this.s2CountsLayerGroup.addLayer(counts);
		this.s2TotalsLayerGroup.addLayer(totals);
	};
}

const singleton = new S2Store();
export default singleton;
