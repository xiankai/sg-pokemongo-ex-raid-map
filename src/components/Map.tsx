import * as L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import DevTools from 'mobx-react-devtools';
import * as React from 'react';
import MapStore from '../model/MapStore';
import Controls from './Controls';
import Filters from './Filters/Filters';
import './Map.css';
import './Marker.css';
import './Popup.css';
import './S2.css';

// https://github.com/PaulLeCam/react-leaflet/issues/255#issuecomment-269750542
// tslint:disable-next-line
delete L.Icon.Default.prototype['_getIconUrl'];
L.Icon.Default.mergeOptions({
	iconRetinaUrl,
	iconUrl,
	shadowUrl,
});

export default class Map extends React.Component<
	{},
	{
		ready: boolean;
	}
> {
	public refs: {
		[key: string]: Element;
		map: HTMLInputElement; // !important
	};

	public state = {
		ready: false,
	};

	public componentDidMount() {
		const center = process.env.REACT_APP_DEFAULT_CENTER.split(',').map(
			Number
		);
		const minZoom = +process.env.REACT_APP_MIN_ZOOM;
		const zoom = +process.env.REACT_APP_DEFAULT_ZOOM;
		MapStore.map = L.map(this.refs.map, {
			center: [center[0], center[1]],
			minZoom,
			zoom,
		}).on('baselayerchange', () => {
			MapStore.addToMap(
				MapStore.activeFilter.get(),
				MapStore.activeSecondary.get()
			);
		});

		this.renderTileLayer();

		this.setState({
			ready: true,
		});
	}

	public renderTileLayer = () => {
		if (!process.env.REACT_APP_TILE_SERVER) {
			throw Error('You must define REACT_APP_TILE_SERVER');
		}

		L.tileLayer(process.env.REACT_APP_TILE_SERVER || '', {
			attribution: `&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors | ${
				process.env.REACT_APP_MAP_ATTRIBUTION
			}`,
		}).addTo(MapStore.map);
	}

	public render() {
		return (
			<>
				<div id="map" ref="map" />
				{this.state.ready && (
					<>
						<Filters />
						<Controls />
					</>
				)}
				{process.env.NODE_ENV === 'development' &&
					process.env.REACT_APP_MOBX_DEVTOOLS === 'true' && (
						<DevTools />
					)}
			</>
		);
	}
}
