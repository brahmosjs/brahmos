import App from './App.js';
import { render, createElement } from '../src';

render(createElement(App, { name: 'World' }), document.getElementById('app'));
