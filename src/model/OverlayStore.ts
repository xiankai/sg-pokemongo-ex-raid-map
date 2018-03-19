import { featureGroup, FeatureGroup, geoJSON, GeoJSON } from 'leaflet';

interface IOverlayConfig {
	url?: string;
	label?: string;
}

class OverlayStore {
	public static parseOverlayConfig = () => {
		const toParse = (process.env.REACT_APP_OVERLAYS || '')
			.split(',')
			.filter(Boolean)
			.map(String);

		if (toParse.length % 2 === 1) {
			console.warn(
				'REACT_APP_OVERLAYS has an odd number of comma-delimited values, which means at least one overlay is missing a label or url.'
			);
		}

		const overlays: IOverlayConfig[] = [];
		toParse.forEach((str, index, array) => {
			const overlayIndex = Math.floor(index / 2);

			if (!overlays[overlayIndex]) {
				overlays[overlayIndex] = {};
			}

			overlays[overlayIndex][index % 2 === 1 ? 'url' : 'label'] = str;
		});

		return overlays;
	}

	public label: string;
	public overlayLayer: GeoJSON = geoJSON();
	public layer: FeatureGroup = featureGroup([this.overlayLayer]);

	constructor({ label, url }: IOverlayConfig) {
		const init = async () => {
			if (!label || !url) {
				return;
			}

			const response = await fetch(url);

			const data = await response.json();

			this.overlayLayer.addData(data);
		};

		init();
	}
}

export default OverlayStore;
