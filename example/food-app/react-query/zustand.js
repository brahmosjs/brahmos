import create from 'zustand';

export const useDietStore = create((set) => ({
  diet: 'all',
  changeDiet: () => set((state) => ({ diet: state.diet === 'veg' ? 'all' : 'veg' })),
}));

export const useCartStore = create((set, get) => ({
  cartByIds: {},
  addToCart(itemId) {
    const { cartByIds } = get();

    const cartItem = cartByIds[itemId] || {
      quantity: 0,
    };

    cartItem.quantity += 1;

    const newCart = {
      ...cartByIds,
      [itemId]: cartItem,
    };

    set({
      cartByIds: newCart,
    });
  },
  removeFromCart(itemId) {
    const { cartByIds } = get();

    const cartItem = cartByIds[itemId];

    if (!cartItem) {
      return;
    }

    cartItem.quantity -= 1;

    const newCart = {
      ...cartByIds,
      [itemId]: cartItem,
    };

    set({
      cartByIds: newCart,
    });
  },
}));
