import { IGeoJSONFeature } from '../@types/geojson';
import { mergeLegacyGyms } from './Popup';

const generateDummyGym = (name: string, properties?: any): IGeoJSONFeature => ({
	type: '',
	geometry: {
		type: 'Point',
		coordinates: [0, 0],
	},
	properties: {
		dates: [],
		name,
		terrains: [],
		...properties,
	},
});

describe('mergeLegacyGyms', () => {
	const twoGyms = [generateDummyGym('a'), generateDummyGym('b')];

	it('nothing to merge', () => {
		expect(mergeLegacyGyms(twoGyms)).toEqual(twoGyms);
	});

	const oneGymB = [
		generateDummyGym('b', {
			inherit: generateDummyGym('a'),
		}),
	];

	it('1 merge', () => {
		twoGyms[0].properties.supercededBy = 'b';
		expect(mergeLegacyGyms(twoGyms)).toEqual(oneGymB);
	});

	const threeGyms = [
		generateDummyGym('a', { supercededBy: 'b' }),
		generateDummyGym('b', { supercededBy: 'c' }),
		generateDummyGym('c'),
	];

	const oneGymC = [
		generateDummyGym('c', {
			inherit: generateDummyGym('b', {
				inherit: generateDummyGym('a'),
			}),
		}),
	];

	it('double merge', () => {
		expect(mergeLegacyGyms(threeGyms)).toEqual(oneGymC);
	});

	const obsoleteGym = [
		generateDummyGym('d', {
			supercededBy: 'Obsolete',
		}),
	];

	const oneGymD = [
		generateDummyGym('d', {
			inherit: null,
		}),
	];

	it('obsolete gym', () => {
		expect(mergeLegacyGyms(obsoleteGym)).toEqual(oneGymD);
	});
});
