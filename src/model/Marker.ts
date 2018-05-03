import { Feature } from 'geojson';
import { GeoJSONOptions, icon, marker } from 'leaflet';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import * as moment from 'moment';
import { IGeoJSONFeature } from '../@types/geojson';

const rawDateFormat = process.env.REACT_APP_RAW_DATE_FORMAT;
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
			className:
				geoJsonPoint.properties.inherit === null ? 'obsolete' : '',
		});
	}

	return marker(latLng, markerOptions);
};

export const shouldShowMarker = ({
	key,
	value,
	park,
}: {
	key?: string;
	value?: string | moment.Moment;
	park: string;
}) => (
	feature: Feature<IGeoJSONFeature['geometry'], IGeoJSONFeature['properties']>
) => {
	const today = moment();
	const flagFn = () => {
		if (!key || key === 'gyms') {
			return true;
		}

		switch (value) {
			case 'All':
				return feature.properties[key].length > 0;
			case 'Potential': {
				const { terrains, dates } = feature.properties;

				const scheduledForFuture = dates
					.map(date => moment(date, rawDateFormat, true))
					.filter(dateMoment => dateMoment.isAfter(today));

				if (scheduledForFuture.length > 0) {
					return false;
				}

				if (terrains.indexOf(park) > -1) {
					return true;
				}

				return false;
			}
			default:
				if (key === 'dates') {
					if (moment.isMoment(value)) {
						return (
							feature.properties[key]
								.map(date =>
									moment(date, rawDateFormat, true).format(
										'YYYY-MM-DD'
									)
								)
								.indexOf(value.format('YYYY-MM-DD')) > -1
						);
					} else {
						return false;
					}
				}
				return feature.properties[key].indexOf(value) > -1;
		}
	};

	if (flagFn()) {
		return true;
	}
	return false;
};
