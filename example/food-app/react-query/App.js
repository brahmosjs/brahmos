import { Fragment } from 'brahmos';

import { useDietStore } from './zustand';
import { MenuList, Message, PaymentFooter } from './Comps';
import { useLoadFoodQuery, useMenuList } from './hooks';

export default function App() {
  const { diet, changeDiet } = useDietStore();
  const menuQuery = useLoadFoodQuery();
  const menuList = useMenuList();

  const stateAPIStatus = menuQuery.status;

  function handleVegToggle() {
    changeDiet();
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
            value={diet}
            checked={diet === 'veg'}
            onChange={handleVegToggle}
          />
          Veg Only
        </label>
      </header>
      <Message status={stateAPIStatus} />
      {stateAPIStatus === 'success' && (
        <Fragment>
          <main>
            <MenuList menuList={menuList} />
          </main>
          <PaymentFooter />
        </Fragment>
      )}
    </div>
  );
}
