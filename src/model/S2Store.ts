import {
	divIcon,
	featureGroup,
	FeatureGroup,
	geoJSON,
	GeoJSON,
	marker,
} from 'leaflet';
import { IS2GeoJSONFeature } from '../@types/geojson';
import { IS2CellCount } from './MapStore';

interface IS2LatLng {
	topleft: number[];
	topright: number[];
	bottomright: number[];
	bottomleft: number[];
	reference: string;
}

class S2Store {
	public static parseS2Config = () =>
		(process.env.REACT_APP_S2_LEVELS || '')
			.split(',')
			.filter(Boolean)
			.map(Number)
	public url: string = '';
	public valid: boolean = true;
	public cellLevel: number;
	public cellReference: string;

	public latLngs: IS2LatLng[] = [];
	public polygonLayer: GeoJSON = geoJSON();
	public layer: FeatureGroup = featureGroup([this.polygonLayer]);

	constructor({ cellLevel }: { cellLevel: number }) {
		this.cellLevel = cellLevel;
		this.cellReference = `S2L${cellLevel}`;
		this.url = process.env.REACT_APP_S2_URL.replace(
			'{c}',
			String(cellLevel)
		);

		if (!this.url) {
			console.warn(
				`${
					this.url
				} not defined. S2 L${cellLevel} grid will not be available.`
			);

			this.valid = false;

			return null;
		}

		const init = async () => {
			const response = await fetch(this.url);

			const data = await response.json();

			this.latLngs = data.features.map((feature: IS2GeoJSONFeature) => ({
				reference: feature.properties.order,
				bottomleft: [
					feature.coordinates[0][0][1],
					feature.coordinates[0][0][0],
				],
				bottomright: [
					feature.coordinates[0][1][1],
					feature.coordinates[0][1][0],
				],
				topleft: [
					feature.coordinates[0][3][1],
					feature.coordinates[0][3][0],
				],
				topright: [
					feature.coordinates[0][2][1],
					feature.coordinates[0][2][0],
				],
			}));
			this.polygonLayer.addData(data);
		};

		init();
	}

	public overlayS2Labels = (s2CellCount: IS2CellCount) => {
		this.layer.clearLayers();
		this.layer.addLayer(this.polygonLayer);

		const s2Cells = featureGroup(
			this.latLngs.map(({ reference, topleft }) =>
				marker(
					{ lat: topleft[0], lng: topleft[1] },
					{
						icon: divIcon({
							className: 's2-label',
							html: s2CellCount[reference]
								? `${reference} <span class="s2-label s2-count">(${
										s2CellCount[reference].count
								  })</span>`
								: '',
						}),
					}
				)
			)
		);
		this.layer.addLayer(s2Cells);

		// const counts = featureGroup(
		// 	this.latLngs.map(({ reference, topright }) =>
		// 		marker(
		// 			{ lat: topright[0], lng: topright[1] },
		// 			{
		// 				icon: divIcon({
		// 					className: 's2-label s2-count',
		// 					html: s2CellCount[reference]
		// 						? String(s2CellCount[reference].count)
		// 						: '',
		// 				}),
		// 			}
		// 		)
		// 	)
		// );
		// this.layer.addLayer(counts);

		// const totals = featureGroup(
		// 	this.latLngs.map(({ reference, bottomleft }) =>
		// 		marker(
		// 			{ lat: bottomleft[0], lng: bottomleft[1] },
		// 			{
		// 				icon: divIcon({
		// 					className: 's2-label s2-total',
		// 					html: s2CellCount[reference]
		// 						? String(s2CellCount[reference].total)
		// 						: '',
		// 				}),
		// 			}
		// 		)
		// 	)
		// );
		// this.layer.addLayer(totals);
	}
}

export default S2Store;
