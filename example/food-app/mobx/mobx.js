import { createContext, useContext, useEffect } from 'brahmos';
import { makeAutoObservable, toJS } from 'mobx';

export class RootStore {
  diet = 'all';
  menu = [];

  constructor() {
    makeAutoObservable(this);
  }

  changeDiet() {
    const newDiet = this.diet === 'veg' ? 'all' : 'veg';
    this.diet = newDiet;
  }

  loadMenu(menuList) {
    const menu = menuList.map((item) => {
      return {
        ...item,
        quantity: 0,
      };
    });
    this.menu = menu;
  }

  addToCart(item) {
    item.quantity += 1;
  }

  removeFromCart(item) {
    if (item.quantity !== 0) {
      item.quantity -= 1;
    }
  }

  get menuList() {
    if (this.diet === 'all') {
      return this.menu;
    }

    return this.menu.filter((item) => item.diet === this.diet);
  }

  get cartPrice() {
    let total = 0;
    this.menuList.forEach((item) => {
      total += item.price * item.quantity;
    });
    return total;
  }
}

const RootStoreContext = createContext();

export const RootStoreProvider = RootStoreContext.Provider;
export const RootStoreConsumer = RootStoreContext.Consumer;

export function useRootStore() {
  const rootStore = useContext(RootStoreContext);

  if (rootStore === undefined) {
    throw new Error('useRootStore must be used within a RootStoreProvider');
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !window.mobx) {
      window.mobx = {
        rootStore,
        toJS,
      };
    }
  }, [rootStore]);

  return rootStore;
}
