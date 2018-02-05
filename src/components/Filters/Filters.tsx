import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import MapStore from '../../model/MapStore';
import './Filters.css';

class Filters extends React.Component<{}, {}> {
	public handleFilterClick = (name: string) => () =>
		MapStore.active.set(name);
	public handleSecondaryFilterClick = (name: string) => () =>
		MapStore.activeSecondary.set(name);

	public render() {
		return (
			<>
				<div className="primary-filter btn-group">
					{MapStore.filters.map(filter => (
						<div
							key={filter.name}
							className={
								MapStore.active.get() === filter.name
									? 'active btn'
									: 'btn'
							}
							onClick={this.handleFilterClick(filter.name)}
						>
							{filter.label}
						</div>
					))}
				</div>
				<div className="secondary-filter btn-group">
					{MapStore.secondaryFilter.get().map(secondaryFilter => (
						<div
							key={secondaryFilter}
							className={
								MapStore.activeSecondary.get() ===
								secondaryFilter
									? 'active btn'
									: 'btn'
							}
							onClick={this.handleSecondaryFilterClick(
								secondaryFilter
							)}
						>
							{MapStore.activeFilter.get() !== 'dates' ||
							secondaryFilter === 'All'
								? secondaryFilter
								: moment(
										secondaryFilter,
										process.env.REACT_APP_RAW_DATE_FORMAT,
										true
									).format(
										process.env
											.REACT_APP_DISPLAY_DATE_FORMAT
									)}
						</div>
					))}
				</div>
			</>
		);
	}
}

export default observer(Filters);
