import App from './App.js';
import UnMountAtNode from './UnMountAtNode';
import Brahmos, { render } from '../src';

render(<App />, document.getElementById('app'));

render(<UnMountAtNode/>, document.getElementById('unmount-node'));
