import { GeoJSONOptions, icon, marker } from 'leaflet';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import * as moment from 'moment';

const displayDateFormat = process.env.REACT_APP_DISPLAY_DATE_FORMAT;

export const renderMarker = (
	allDates: moment.Moment[]
): GeoJSONOptions['pointToLayer'] => (geoJsonPoint, latLng) => {
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
	const eligibleDates = allDates.filter(
		date =>
			(process.env.REACT_APP_DATES_TO_EXCLUDE || '')
				.split(',')
				.filter(Boolean)
				.indexOf(date.format(displayDateFormat)) < 0
	);

	if (dates.length >= Math.floor(eligibleDates.length / 2)) {
		customMarker = 'red';
	}

	if (customMarker) {
		markerOptions.icon = icon({
			iconAnchor: [12, 41],
			iconUrl: `${process.env.PUBLIC_URL}/markers/${customMarker}.png`,
			shadowUrl,
			popupAnchor: [0, -32],
		});
	}

	return marker(latLng, markerOptions);
};
