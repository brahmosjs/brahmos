import { observer } from 'mobx-react-lite';

import { useRootStore } from './mobx';

export const MenuItem = observer(function MenuItem(props) {
  const { item } = props;
  const { quantity } = item;
  const rootStore = useRootStore();

  function handleIncrement() {
    rootStore.addToCart(item);
  }

  function handleDecrement() {
    rootStore.removeFromCart(item);
  }

  const addBtn = (
    <button
      aria-label={`Add ${item.label} to cart`}
      className="menu-btn-add"
      onClick={handleIncrement}
    >
      Add <IconPlus />
    </button>
  );

  const increaseBtn = (
    <button
      aria-label={`Add ${item.label} to cart`}
      className="menu-btn-item"
      onClick={handleIncrement}
    >
      <IconPlus />
    </button>
  );

  const decreaseBtn = (
    <button
      aria-label={`Remove ${item.label} from cart`}
      className="menu-btn-item"
      onClick={handleDecrement}
    >
      <IconMinus />
    </button>
  );

  const qtyIndicator = (
    <div className="menu-item-qty" role="status" aria-live="polite">
      {quantity}
    </div>
  );

  return (
    <li className="menu-item">
      <div>
        <div className="menu-item-title">
          <h4>{item.label}</h4>
          <span>(${item.price})</span>
        </div>
        <p className="menu-item-description">{item.description}</p>
      </div>
      {quantity === 0 ? (
        addBtn
      ) : (
        <div className="menu-btn-group">
          {decreaseBtn}
          {qtyIndicator}
          {increaseBtn}
        </div>
      )}
    </li>
  );
});

export const MenuList = observer(function MenuList() {
  const rootStore = useRootStore();
  const { menuList } = rootStore;

  return (
    <ul className="menu-list">
      {menuList.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </ul>
  );
});

export function Message(props) {
  const { status } = props;

  const messages = {
    loading: 'Loading...',
    error: (
      <>
        Menu failed to load.
        <br />
        Please try again...
      </>
    ),
  };

  const messageText = messages[status];

  if (!messageText) {
    return null;
  }

  return (
    <div
      className={`message-${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      aria-busy={status === 'loading'}
    >
      {messageText}
    </div>
  );
}

export const PaymentFooter = observer(function PaymentFooter() {
  const rootStore = useRootStore();
  const { cartPrice } = rootStore;

  return (
    <footer>
      {cartPrice > 0 && (
        <a
          href="#payment"
          onClick={(e) => e.preventDefault()}
          className="food-app-pay-btn"
          aria-live="polite"
        >
          Pay for food (${cartPrice})
        </a>
      )}
    </footer>
  );
});

// source- https://feathericons.com/
export function IconPlus() {
  return (
    <svg
      className="icon-plus"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

// source- https://feathericons.com/
export function IconMinus() {
  return (
    <svg
      className="icon-minus"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
