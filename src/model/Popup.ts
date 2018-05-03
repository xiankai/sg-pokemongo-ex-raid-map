import { Content, Marker } from 'leaflet';
import * as moment from 'moment';
import { IGeoJSONFeature } from '../@types/geojson';

const rawDateFormat = process.env.REACT_APP_RAW_DATE_FORMAT;
const displayDateFormat = process.env.REACT_APP_DISPLAY_DATE_FORMAT;
const displayTimeFormat = process.env.REACT_APP_DISPLAY_TIME_FORMAT;

export const renderPopup = ({ cellLevel }: { cellLevel: number }) => (
	layer: Marker
): Content => {
	let feature = layer.feature;
	let lngLat = feature.geometry.coordinates;
	lngLat = lngLat.map((x: number) => Math.round(x * 10e6) / 10e6);

	let exraidHTML = '';
	let cellHTML = '';

	if (cellLevel) {
		cellHTML += `<div>S2 L${cellLevel} Cell: ${
			feature.properties[`S2L${cellLevel}`]
		}</div>`;
		cellHTML += `<br />`;
	}

	let inherit = false;
	do {
		exraidHTML += `
			<strong>
				${inherit ? '(Previously was) ' : ''}
				${feature.properties.inherit === null ? '(Removed) ' : ''}
				${feature.properties.name} 
			</strong>
		`;
		exraidHTML += renderDates(feature.properties.dates);
		exraidHTML += '<br />';
		feature = feature.properties.inherit;
		inherit = true;
	} while (feature);

	const label = process.env.REACT_APP_MAP_LINK_LABEL;
	const url = (process.env.REACT_APP_MAP_LINK_URL || '')
		.replace('{lng}', String(lngLat[1]))
		.replace('{lat}', String(lngLat[0]));

	let extraLink = '';
	if (label && url) {
		extraLink = `
            <div>
                <a target="_blank" href="${url}">${label}</a>
            </div>
        `;
	}

	return `
		${exraidHTML}
		${cellHTML}
        <div>
            <a target="_blank" href="
            https://www.google.com/maps/search/?api=1&query=${lngLat[1]},${
		lngLat[0]
	}
            ">Google Maps</a>
        </div>
        <br/>
        ${extraLink}
    `;
};

export const mergeLegacyGyms = (gyms: IGeoJSONFeature[]): IGeoJSONFeature[] => {
	const mapFn = (currentGym: IGeoJSONFeature) => {
		if (currentGym.properties.supercededBy === 'Obsolete') {
			delete currentGym.properties.supercededBy;
			currentGym.properties.inherit = null;
			return currentGym;
		}

		const superceding = gyms.find(
			gym => currentGym.properties.name === gym.properties.supercededBy
		);
		if (!superceding) {
			return currentGym;
		}

		currentGym.properties.inherit = mapFn(superceding);
		delete currentGym.properties.inherit.properties.supercededBy;

		return currentGym;
	};

	return gyms
		.filter(
			v =>
				!v.properties.supercededBy ||
				v.properties.supercededBy === 'Obsolete'
		)
		.map(mapFn);
};

const renderDates = (dates: string[]): string => {
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
                        ${datetime
							.add(45, 'minutes')
							.format(displayTimeFormat)}`
							: ''
					}</span>
                    </li>`;
			});
		exraidHTML += '</ul></div>';
	} else {
		exraidHTML += '<div>No EX-raid yet</div>';
	}

	return exraidHTML;
};
