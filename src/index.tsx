import * as Raven from 'raven-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Map from './components/Map';
import './index.css';
import registerServiceWorker from './registerServiceWorker';
Raven.config('https://aba13d4b00f2498d8ae696d22a2e0c36@sentry.io/252833', {
	release: process.env.REACT_APP_VERSION,
}).install();

ReactDOM.render(<Map />, document.getElementById('root') as HTMLElement);
registerServiceWorker();
