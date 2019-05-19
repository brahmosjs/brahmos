import App from './App.js';
import { render, createElement } from '../src';

const a = performance.now();
render(createElement(App, { name: 'World' }), document.getElementById('app'));

console.log(performance.now() - a);
