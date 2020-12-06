import { render } from 'brahmos';
import { HashRouter as Router } from 'react-router-dom';

import App from './App.js';

function RootApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}

render(<RootApp />, document.getElementById('app'));
