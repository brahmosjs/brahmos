import Brahmos, { createPortal } from '../src';

function CreatePortalExample () {
  return (<div>
    {createPortal(<div>Hello New Root!</div>, document.querySelector('#another-root'))}
  </div>);
}

export default CreatePortalExample;
