import { fireEvent } from '@testing-library/dom';

import { createContext, useState } from '../';
import { useContext } from '../brahmos';

import { render, unmountAll, sleep } from './testUtils';

describe('Test attribute', () => {
  const TestContext = createContext();
  const { Provider, Consumer } = TestContext;

  it('should allow passing null on style prop', async () => {
    function Test(style) {
      return <div style={null}>Hell World</div>;
    }

    expect(() => render(<Test />)).not.toThrow();
  });
});
