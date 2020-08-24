import Brahmos, { createPortal, useState } from 'brahmos';

function Modal({ onClose }) {
  return (
    <div className="modal is-active">
      <div className="modal-background"></div>
      <div className="modal-card content">
        <header className="modal-card-head">
          <p className="modal-card-title">Modal title</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          <h1>Hello World</h1>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla accumsan, metus ultrices
            eleifend gravida, nulla nunc varius lectus, nec rutrum justo nibh eu lectus. Ut
            vulputate semper dui. Fusce erat odio, sollicitudin vel erat vel, interdum mattis neque.
          </p>
        </section>
        <footer className="modal-card-foot">
          <button className="button is-primary" onClick={onClose}>
            Save changes
          </button>
          <button className="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function CreatePortalExample() {
  const [display, setDisplay] = useState(false);
  return (
    <div>
      {display &&
        createPortal(
          <Modal onClose={() => setDisplay(false)} />,
          document.querySelector('#portal-container'),
        )}
      <p>
        <strong>Click button to open modal.</strong> The modal will open in another root element.
      </p>
      <button
        className="button is-primary"
        onClick={() => {
          setDisplay(true);
        }}
      >
        Open Modal
      </button>
    </div>
  );
}
