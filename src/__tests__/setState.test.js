import { fireEvent } from '@testing-library/dom';
import { html } from 'js-beautify';

import { Component } from '../';

import { render, unmountAll, sleep } from './testUtils';

describe('Test setState', () => {
  it('should handle setState in componentDidMount in multiple level', async () => {
    class Child extends Component {
      state = {
        value: 1,
      };

      componentDidMount() {
        this.setState({ value: 2 });
      }

      render() {
        return (
          <div>
            <span>{this.state.value}</span>
          </div>
        );
      }
    }

    class Parent extends Component {
      state = {
        value: 1,
      };

      componentDidMount() {
        this.setState({ value: 2 });
      }

      render() {
        return (
          <div>
            <span>{this.state.value}</span>
            <Child />
          </div>
        );
      }
    }

    // we await as set states are happened on next micro task
    const { container } = await render(<Parent />);

    expect(container.textContent).toEqual('22');
  });

  it('should give correct value of state inside setState callback ', async () => {
    let effectiveState = 0;

    class Test extends Component {
      state = {
        value: 1,
      };

      componentDidMount() {
        this.setState({ value: 2 }, () => {
          effectiveState = this.state.value;
        });
      }

      render() {
        return (
          <div>
            <span>{this.state.value}</span>
          </div>
        );
      }
    }

    // we await as set states are happened on next micro task
    await render(<Test />);

    await sleep(0);

    expect(effectiveState).toEqual(2);
  });

  it('should not cause multiple repaint if another setState happens in setState callback', async () => {
    class Test extends Component {
      state = {
        value: 1,
      };

      onClick = () => {
        this.setState({ value: 2 }, () => {
          this.setState({ value: 3 });
        });
      };

      render() {
        return (
          <div>
            <span className="value">{this.state.value}</span>
            <button data-testid="button" onClick={this.onClick}>
              Increment
            </button>
          </div>
        );
      }
    }

    const { container } = await render(<Test />);

    fireEvent.click(container.getByTestId('button'));

    await sleep(0);

    expect(container.querySelector('.value').textContent).toEqual('3');
  });

  it('should not cause multiple repaint if another setState happens in componentDidMount/componentDidUpdate', async () => {
    class Test extends Component {
      state = {
        value: 1,
      };

      componentDidUpdate() {
        if (this.state.value !== 3) {
          this.setState({ value: 3 });
        }
      }

      render() {
        return (
          <div>
            <span className="value">{this.state.value}</span>
          </div>
        );
      }
    }

    const { container, ref } = await render(<Test />);

    ref.setState({ value: 2 });
    /**
     * We are trying to simulate actual repaint case.
     * await for micro task as setState updates are batched
     */
    await 1;

    await sleep(0);

    expect(container.querySelector('.value').textContent).toEqual('3');
  });
});
