import * as React from 'react';
import Locate from './Locate';
import Search from './Search/Search';

export default class Controls extends React.Component<{}, {}> {
	public render() {
		return (
			<>
				<Locate />
				<Search />
			</>
		);
	}
}
