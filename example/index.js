import App from './App.js';
import UnMountAtNode from './UnMountAtNode';
import Brahmos, { render } from '../src';
import ConcurrentApp from './concurrentApp';
import SuspenseApp from './suspenseExamples';

render(<SuspenseApp />, document.getElementById('app'));

// render(<UnMountAtNode/>, document.getElementById('unmount-node'));
