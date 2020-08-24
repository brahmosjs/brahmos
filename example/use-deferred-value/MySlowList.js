import Brahmos, { PureComponent } from 'brahmos';

// Note: this file is exactly the same in both examples.

function ListItem({ children }) {
  const now = performance.now();
  while (performance.now() - now < 1.5) {
    // Note: this is an INTENTIONALLY EMPTY loop that
    // DOES NOTHING for 1.5 milliseconds for EACH ITEM.
    //
    // It's meant to emulate what happens in a deep
    // component tree with calculations and other
    // work performed inside components that can't
    // trivially be optimized or removed.
  }
  return <div className="ListItem">{children}</div>;
}

export default class MySlowList extends PureComponent {
  render() {
    const { text } = this.props;
    const items = [];
    const ln = text.length * 5;
    for (let i = 0; i < ln; i++) {
      items.push(
        <ListItem key={i}>
          Result #{i} for "{text}"
        </ListItem>,
      );
    }
    return (
      <>
        <p>
          <b>Results for "{text}":</b>
        </p>
        <ul className="List">{items}</ul>
      </>
    );
  }
}
