import tearDown from './tearDown';

function unmountComponentAtNode( container ){
  /**
    * if container has a brahmosNode, it will be tear down.
    */
  if( container.__brahmosNode ){
    tearDown( container.__brahmosNode, { parentNode: container } );
    return true;
  }
  return false;
}

export default unmountComponentAtNode;
