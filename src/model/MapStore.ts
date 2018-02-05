import {
	geoJSON,
	// icon,
	LayerGroup,
	Map,
	marker,
	markerClusterGroup,
} from 'leaflet';
import 'leaflet.markercluster';
import { autorun, computed, observable, reaction } from 'mobx';
import * as moment from 'moment';
import {
	FilterFunction,
	IGeoJSON,
	IGeoJSONFeature,
	LoopFunction,
} from '../@types/geojson';
import S2Store from './S2Store';

export interface IS2CellCount {
	[s2Cell: string]: {
		count: number;
		total: number;
	};
}

const rawDateFormat = process.env.REACT_APP_RAW_DATE_FORMAT;
const displayDateFormat = process.env.REACT_APP_DISPLAY_DATE_FORMAT;

class MapStore {
	public map: Map;
	public layer: LayerGroup;
	public markers: LayerGroup;

	public terrains = observable([]);
	public defaultTerrain = computed(() => {
		return this.terrains.slice()[0];
	});
	public dates = observable([]);
	public defaultDate = computed(() => {
		return this.dates.slice()[0];
	});
	public gyms: IGeoJSONFeature[] = observable([]);

	public active = observable('dates');
	public filters = [
		{ name: 'gyms', label: 'All Gyms' },
		{ name: 'terrains', label: 'Park Gyms' },
		{ name: 'dates', label: 'EX-Raid Gyms' },
	];
	public activeFilter = computed(() => {
		const activeFilter = this.filters.find(
			f => f.name === this.active.get()
		);
		return activeFilter ? activeFilter.name : null;
	});

	public activeSecondary = observable('All');
	public secondaryFilter = computed(() => {
		switch (this.activeFilter.get()) {
			case 'terrains':
				return this.terrains;
			case 'dates':
				return [].concat('All', this.dates.slice());
			default:
				return [];
		}
	});

	constructor() {
		if (!process.env.REACT_APP_GYM_URL) {
			console.warn(
				'REACT_APP_GYM_URL not defined. No gyms will be loaded.'
			);
		}

		async function init() {
			const response = await fetch(process.env.REACT_APP_GYM_URL || '');

			const data: IGeoJSON = await response.json();

			return data.features;
		}

		init().then(features => {
			this.gyms = features;

			const terrains = [].concat(
				...this.gyms.map(feature => feature.properties.terrains)
			);

			this.terrains.push(
				...terrains.filter(
					(item, pos) => item && terrains.indexOf(item) === pos
				)
			);

			const dates = [].concat(
				...this.gyms.map(feature => feature.properties.dates)
			);

			this.dates.push(
				...dates
					.filter((item, pos) => item && dates.indexOf(item) === pos)
					.sort(
						(a, b) =>
							moment(b, rawDateFormat, true).unix() -
							moment(a, rawDateFormat, true).unix()
					)
			);
		});

		autorun(() => {
			const key = this.activeFilter.get();
			switch (key) {
				case 'terrains':
					this.activeSecondary.set(this.defaultTerrain.get());
					break;
				case 'dates':
					this.activeSecondary.set(this.defaultDate.get());
					break;
				default:
					this.addToMap();
			}
		});

		reaction(
			() => ({
				key: this.activeFilter.get(),
				value: this.activeSecondary.get(),
			}),
			({ key, value }) => this.addToMap(key, value)
		);

		this.markers = markerClusterGroup({
			disableClusteringAtZoom: 14,
			maxClusterRadius: () => (this.active.get() === 'dates' ? 0 : 80),
			spiderfyOnMaxZoom: false,
		});
	}

	public addToMap = (key?: string, value?: string) => {
		const filter: FilterFunction = (feature: IGeoJSONFeature) => {
			if (!key) {
				return true;
			}

			if (value === 'All') {
				return (
					feature.properties[key] &&
					feature.properties[key].length > 0
				);
			} else {
				return (
					feature.properties[key] &&
					feature.properties[key].indexOf(value) > -1
				);
			}
		};
		const s2CellCount: IS2CellCount = {};
		let onEachFeature: LoopFunction = () => {};
		const isS2Toggled = this.map.hasLayer(S2Store.s2LayerGroup);
		if (isS2Toggled) {
			onEachFeature = (feature: IGeoJSONFeature) => {
				const total = feature.properties.dates.length;
				const s2Cell = s2CellCount[feature.properties.s2Cell];

				if (s2Cell) {
					s2CellCount[feature.properties.s2Cell] = {
						count: s2Cell.count + 1,
						total: s2Cell.total + total,
					};
				} else {
					s2CellCount[feature.properties.s2Cell] = {
						count: 1,
						total,
					};
				}
			};
		}

		const FeatureCollection: any = {
			features: this.gyms.slice(),
			type: 'FeatureCollection',
		};

		const markerOptions: any = {
			opacity: isS2Toggled ? 0.7 : 1,
		};

		// switch (key) {
		// 	case 'terrains':
		// 		markerOptions.icon = icon({
		// 			iconAnchor: [12, 41],
		// 			iconUrl: process.env.PUBLIC_URL + '/markers/green.png',
		// 			popupAnchor: [0, -28],
		// 		});
		// 		break;
		// }

		this.layer = geoJSON(FeatureCollection, {
			filter,
			onEachFeature,
			pointToLayer: (geoJsonPoint, latLng) =>
				marker(latLng, markerOptions),
		});

		if (isS2Toggled) {
			S2Store.overlayS2Labels(s2CellCount);
		}

		this.markers.clearLayers();
		this.markers
			.addLayer(this.layer)
			.bindPopup(this.renderPopup, { autoPanPaddingTopLeft: [100, 100] });

		this.map.addLayer(this.markers);
	};

	public renderPopup = (layer: any) => {
		const feature = layer.feature;
		const dates = feature.properties.dates;
		let lngLat = feature.geometry.coordinates;
		lngLat = lngLat.map((x: number) => Math.round(x * 10e6) / 10e6);

		let exraidHTML = '';
		if (dates && dates.length > 0) {
			dates.forEach((date: string) => {
				exraidHTML =
					'<li>' +
					moment(date, rawDateFormat, true).format(
						displayDateFormat
					) +
					'</li>' +
					exraidHTML;
			});
			exraidHTML = '<div>EX-dates:<ul>' + exraidHTML;
			exraidHTML += '</ul></div>';
		} else {
			exraidHTML += '<div>No EX-raid yet</div>';
		}

		return `
			<strong>
				${feature.properties.name}
			</strong>
			${exraidHTML}
			<div>S2 Cell: ${feature.properties.s2Cell}</div>
			<br/>
			<div>
				<a target="_blank" href="
				https://www.google.com/maps/search/?api=1&query=${lngLat[1]},${lngLat[0]}
				">Google Maps</a>
			</div>
			<br/>
			<div>
				<a target="_blank" href="
				https://sgpokemap.com/gym.html#${lngLat[1]},${lngLat[0]}
				">SGPokemap</a>
			</div>
		`;
	};
}

const singleton = new MapStore();
export default singleton;
