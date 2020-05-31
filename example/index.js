import App from './App.js';
import UnMountAtNode from './UnMountAtNode';
import Brahmos, { render } from '../src';
import ConcurrentApp from './concurrentApp';

render(<ConcurrentApp />, document.getElementById('app'));

// render(<UnMountAtNode/>, document.getElementById('unmount-node'));
