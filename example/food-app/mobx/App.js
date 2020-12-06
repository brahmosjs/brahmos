import { Fragment, useEffect, useState } from 'brahmos';
import { observer } from 'mobx-react-lite';

import { useRootStore } from './mobx';
import { MenuList, Message, PaymentFooter } from './Comps';
import { loadFoodData } from '../utils';

const App = observer(function App() {
  const rootStore = useRootStore();
  const stateAPIStatus = useLoadFoodData();

  function handleVegToggle() {
    rootStore.changeDiet();
  }

  return (
    <div className="food-app">
      <header>
        <h1>Ordux</h1>
        <label>
          <input
            type="checkbox"
            className="veg-filter"
            name="veg-checkbox"
            value={rootStore.diet}
            checked={rootStore.diet === 'veg'}
            onChange={handleVegToggle}
          />
          Veg Only
        </label>
      </header>
      <Message status={stateAPIStatus} />
      {stateAPIStatus === 'success' && (
        <Fragment>
          <main>
            <MenuList />
          </main>
          <PaymentFooter />
        </Fragment>
      )}
    </div>
  );
});

function useLoadFoodData() {
  const [stateAPIStatus, setAPIStatus] = useState('idle');
  const rootStore = useRootStore();

  useEffect(() => {
    setAPIStatus('loading');
    loadFoodData()
      .then((data) => {
        rootStore.loadMenu(data);
        setAPIStatus('success');
      })
      .catch((error) => {
        setAPIStatus('error');
      });
  }, [rootStore]);

  return stateAPIStatus;
}

export default App;
