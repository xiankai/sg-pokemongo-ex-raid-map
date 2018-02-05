import * as LeafletSearch from 'leaflet-search';
import 'leaflet-search/src/leaflet-search.css';
import { observer } from 'mobx-react';
import * as React from 'react';
import MapStore from '../../model/MapStore';
import './Search.css';

class Search extends React.Component<{}, {}> {
	public searchControl: any;

	public componentWillMount() {
		this.searchControl = new LeafletSearch({
			autoCollapse: true,
			hideMarkerOnCollapse: true,
			initial: false,
			layer: MapStore.markers,
			propertyName: 'name',
			zoom: 14,
			// moveToLocation: (latlng, title, map) => {
			//   map.panTo(latlng);
			//   markers.openPopup(L.latLng(latlng.lat, latlng.lng));
			// },
		});
		MapStore.map.addControl(this.searchControl);
	}

	public render() {
		return <div />;
	}
}

export default observer(Search);
