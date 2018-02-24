import {
	control,
	geoJSON,
	icon,
	LayerGroup,
	Map,
	marker,
	markerClusterGroup,
	tileLayer,
	TileLayer,
} from 'leaflet';
import 'leaflet.markercluster';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { computed, observable, reaction, transaction } from 'mobx';
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
const displayTimeFormat = process.env.REACT_APP_DISPLAY_TIME_FORMAT;

class MapStore {
	public map: Map;
	public layer: LayerGroup;
	public defaultLayer: TileLayer = tileLayer('');
	public markers: LayerGroup;
	public s2Levels: number[] = (process.env.REACT_APP_S2_LEVELS || '')
		.split(',')
		.filter(Boolean)
		.map(Number);
	public s2Stores: S2Store[] = [];

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
		const activeFilter = this.filters.filter(
			f => f.name === this.active.get()
		);
		return activeFilter.length > 0 ? activeFilter[0].name : null;
	});

	public activeSecondary = observable('Potential');
	public secondaryFilter = computed(() => {
		switch (this.activeFilter.get()) {
			case 'terrains':
				return this.terrains;
			case 'dates':
				return [].concat('All', 'Potential', this.dates.slice());
			default:
				return [];
		}
	});

	public activeS2 = computed(() => {
		const s2Store = this.s2Stores.filter(store =>
			this.map.hasLayer(store.layer)
		);
		return s2Store.length > 0 ? s2Store[0] : null;
	});

	public totalCount = observable(0);

	constructor() {
		if (!process.env.REACT_APP_GYM_URL) {
			console.warn(
				'REACT_APP_GYM_URL not defined. No gyms will be loaded.'
			);
		}

		const init = async () => {
			const response = await fetch(process.env.REACT_APP_GYM_URL || '');

			const data: IGeoJSON = await response.json();

			this.gyms = data.features;

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

			// Run once. Have to do this for "Potential"
			this.addToMap(this.activeFilter.get(), this.activeSecondary.get());
		};

		init().then(() => {
			if (this.s2Levels.length > 0) {
				control
					.layers(
						this.s2Levels.reduce(
							(obj, cellLevel) => {
								const s2Store = new S2Store({ cellLevel });

								if (s2Store.valid) {
									this.s2Stores.push(s2Store);
									obj[`S2 L${cellLevel} grid`] =
										s2Store.layer;
								}
								return obj;
							},
							{
								None: this.defaultLayer,
							}
						)
					)
					.addTo(this.map);
			}

			this.map.addLayer(this.defaultLayer);
			this.map.addLayer(this.markers);
		});

		reaction(
			() => this.activeFilter.get(),
			key => {
				switch (key) {
					case 'terrains':
						this.activeSecondary.set(this.defaultTerrain.get());
						break;
					case 'dates':
						this.activeSecondary.set('Potential');
						break;
					default:
						this.addToMap();
				}
			}
		);

		reaction(
			() => ({
				key: this.activeFilter.get(),
				value: this.activeSecondary.get(),
			}),
			({ key, value }) => this.addToMap(key, value)
		);

		this.markers = markerClusterGroup({
			disableClusteringAtZoom: 15,
			maxClusterRadius: () => (this.totalCount.get() > 200 ? 80 : 0),
			spiderfyOnMaxZoom: false,
		});
	}

	public addToMap = (key?: string, value?: string) =>
		transaction(() => {
			this.totalCount.set(0);
			const filter: FilterFunction = (feature: IGeoJSONFeature) => {
				const flagFn = () => {
					if (!key || key === 'gyms') {
						return true;
					}

					switch (value) {
						case 'All':
							return feature.properties[key].length > 0;
						case 'Potential': {
							const { terrains, dates } = feature.properties;

							const latestDate = moment
								.max(
									...dates.map(date =>
										moment(date, rawDateFormat, true)
									)
								)
								.format(rawDateFormat);

							if (latestDate === this.defaultDate.get()) {
								return false;
							}

							if (
								terrains.indexOf(this.defaultTerrain.get()) > -1
							) {
								return true;
							}

							return false;
						}
						default:
							return feature.properties[key].indexOf(value) > -1;
					}
				};

				if (flagFn()) {
					this.totalCount.set(this.totalCount.get() + 1);
					return true;
				}
				return false;
			};
			const s2CellCount: IS2CellCount = {};
			let onEachFeature: LoopFunction = () => {};

			if (this.activeS2.get()) {
				onEachFeature = (feature: IGeoJSONFeature) => {
					const s2CellLabel =
						feature.properties[this.activeS2.get().cellReference];
					const s2Cell = s2CellCount[s2CellLabel];
					const total = feature.properties.dates.length;
					if (s2Cell) {
						s2CellCount[s2CellLabel] = {
							count: s2Cell.count + 1,
							total: s2Cell.total + total,
						};
					} else {
						s2CellCount[s2CellLabel] = {
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

			this.layer = geoJSON(FeatureCollection, {
				filter,
				onEachFeature,
				pointToLayer: (geoJsonPoint, latLng) => {
					const markerOptions: any = {};

					const { terrains, dates } = geoJsonPoint.properties;

					let customMarker = '';
					if (terrains.length > 0) {
						customMarker = 'green';
					}

					if (dates.length > 0) {
						customMarker = 'black';
					}

					// Take away any dates to exclude
					// like the EX-raid tests, the SL10 bugged release and SL13 one-trick-pony
					// Divide by 2 for raids that occur almost every 2 weeks.
					const eligibleDates = this.dates.filter(
						date =>
							(process.env.REACT_APP_DATES_TO_EXCLUDE || '')
								.split(',')
								.filter(Boolean)
								.indexOf(date) < 0
					);

					if (dates.length >= Math.floor(eligibleDates.length / 2)) {
						customMarker = 'red';
					}

					if (customMarker) {
						markerOptions.icon = icon({
							iconAnchor: [12, 41],
							iconUrl: `${
								process.env.PUBLIC_URL
							}/markers/${customMarker}.png`,
							shadowUrl,
							popupAnchor: [0, -32],
						});
					}

					return marker(latLng, markerOptions);
				},
			});

			if (this.activeS2.get()) {
				this.activeS2.get().overlayS2Labels(s2CellCount);
			}

			this.markers.clearLayers();
			this.markers.addLayer(this.layer).bindPopup(this.renderPopup, {
				autoPanPaddingTopLeft: [100, 100],
			});
		})

	public renderPopup = (layer: any) => {
		const feature = layer.feature;
		const dates = feature.properties.dates;
		let lngLat = feature.geometry.coordinates;
		lngLat = lngLat.map((x: number) => Math.round(x * 10e6) / 10e6);

		let exraidHTML = '';
		if (dates && dates.length > 0) {
			dates
				.sort(
					(a: string, b: string) =>
						moment(b, rawDateFormat, true).unix() -
						moment(a, rawDateFormat, true).unix()
				)
				.forEach((date: string) => {
					const datetime = moment(date, rawDateFormat, true);
					const hasTime = displayTimeFormat && datetime.hour() > 0;
					exraidHTML += `<li>
						<span>${datetime.format(displayDateFormat)}</span>
						<span style="width: 20px;"></span>
						<span>${
							hasTime
								? ` ${datetime.format(displayTimeFormat)} - 
							${datetime.add(45, 'minutes').format(displayTimeFormat)}`
								: ''
						}</span>
						</li>`;
				});
			exraidHTML = '<div>EX-raid(s):<ul>' + exraidHTML;
			exraidHTML += '</ul></div>';
		} else {
			exraidHTML += '<div>No EX-raid yet</div>';
		}

		if (this.activeS2.get()) {
			const cellLevel = this.activeS2.get().cellLevel;
			exraidHTML += `<div>S2 L${cellLevel} Cell: ${
				feature.properties[`S2L${cellLevel}`]
			}</div>`;
		}

		const label = process.env.REACT_APP_MAP_LINK_LABEL;
		const url = (process.env.REACT_APP_MAP_LINK_URL || '')
			.replace('{lng}', lngLat[1])
			.replace('{lat}', lngLat[0]);

		let extraLink = '';
		if (label && url) {
			extraLink = `
				<div>
					<a target="_blank" href="${url}">${label}</a>
				</div>
			`;
		}

		return `
			<strong>
				${feature.properties.name}
			</strong>
			${exraidHTML}
			<br/>
			<div>
				<a target="_blank" href="
				https://www.google.com/maps/search/?api=1&query=${lngLat[1]},${lngLat[0]}
				">Google Maps</a>
			</div>
			<br/>
			${extraLink}
		`;
	}
}

const singleton = new MapStore();
export default singleton;
