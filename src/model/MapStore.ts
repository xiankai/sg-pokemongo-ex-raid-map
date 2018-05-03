import {
	control,
	geoJSON,
	LayerGroup,
	Map,
	markerClusterGroup,
	tileLayer,
	TileLayer,
} from 'leaflet';
import 'leaflet.markercluster';
import { computed, observable, reaction, transaction } from 'mobx';
import * as moment from 'moment';
import { IGeoJSON, IGeoJSONFeature, LoopFunction } from '../@types/geojson';
import { renderMarker, shouldShowMarker } from './Marker';
import OverlayStore from './OverlayStore';
import { mergeLegacyGyms, renderPopup } from './Popup';
import S2Store from './S2Store';

export interface IS2CellCount {
	[s2Cell: string]: {
		count: number;
		total: number;
	};
}

const rawDateFormat = process.env.REACT_APP_RAW_DATE_FORMAT;

class MapStore {
	public map: Map;
	public layer: LayerGroup;
	public defaultLayer: TileLayer = tileLayer('');
	public markers: LayerGroup;
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

			this.gyms = mergeLegacyGyms(data.features);

			const terrains = [].concat(
				...this.gyms.map(feature => feature.properties.terrains)
			);

			this.terrains.push(
				...terrains.filter(
					(item, pos) => item && terrains.indexOf(item) === pos
				)
			);

			const unixDates = []
				.concat(...this.gyms.map(feature => feature.properties.dates))
				.map(date =>
					moment(date, rawDateFormat, true)
						.set('hour', 0)
						.set('minute', 0)
						.set('second', 0)
						.set('millisecond', 0)
						.unix()
				);

			const momentDates = unixDates
				.filter((item, pos) => item && unixDates.indexOf(item) === pos)
				.sort((a, b) => b - a)
				.map(unix => moment.unix(unix));

			this.dates.push(...momentDates);

			// Run once. Have to do this for "Potential"
			this.addToMap(this.activeFilter.get(), this.activeSecondary.get());

			const s2Levels = S2Store.parseS2Config();
			const overlays = OverlayStore.parseOverlayConfig();
			const overlayLayers: any = overlays.reduce((obj, config) => {
				const overlayStore = new OverlayStore(config);

				obj[config.label] = overlayStore.layer;

				return obj;
			}, {});
			if (s2Levels.length > 0) {
				control
					.layers(
						s2Levels.reduce(
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
						),
						overlayLayers
					)
					.addTo(this.map);
			}

			this.map.addLayer(this.defaultLayer);
			this.map.addLayer(this.markers);
		};

		init();
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

	public addToMap = (key?: string, value?: string | moment.Moment) =>
		transaction(() => {
			this.totalCount.set(0);
			const s2 = this.activeS2.get();
			const s2CellCount: IS2CellCount = {};
			let onEachFeature: LoopFunction = () => {};

			if (s2) {
				onEachFeature = (feature: IGeoJSONFeature) => {
					const s2CellLabel = feature.properties[s2.cellReference];
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
				filter: shouldShowMarker({
					key,
					value,
					park: this.defaultTerrain.get(),
				}),
				onEachFeature,
				pointToLayer: renderMarker(this.dates),
			});

			if (s2) {
				s2.overlayS2Labels(s2CellCount);
			}

			this.totalCount.set(this.layer.getLayers().length);

			this.markers.clearLayers();
			this.markers
				.addLayer(this.layer)
				.bindPopup(renderPopup({ cellLevel: s2 && s2.cellLevel }), {
					autoPanPaddingTopLeft: [100, 100],
				});
		});
}

const singleton = new MapStore();
export default singleton;
