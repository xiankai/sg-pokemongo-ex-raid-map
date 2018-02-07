import 'font-awesome/css/font-awesome.css';
import LocateControl from 'leaflet.locatecontrol';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';
import { observer } from 'mobx-react';
import * as React from 'react';
import MapStore from '../model/MapStore';

class Locate extends React.Component<{}, {}> {
	public locateControl: any;

	public componentWillMount() {
		this.locateControl = new LocateControl({
			autoCollapse: true,
			hideMarkerOnCollapse: true,
			initial: false,
			layer: MapStore.layer,
			propertyName: 'name',
			zoom: 15,
			// moveToLocation: (latlng, title, map) => {
			//   map.panTo(latlng);
			//   markers.openPopup(L.latLng(latlng.lat, latlng.lng));
			// },
		});
		MapStore.map.addControl(this.locateControl);
	}

	public render() {
		return <div />;
	}
}

export default observer(Locate);
