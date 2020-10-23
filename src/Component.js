// @flow
import reRender from './reRender';
import { guardedSetState } from './updateUtils';
import { BRAHMOS_DATA_KEY } from './configs';

import type {
  ComponentInstance,
  PureComponentInstance,
  NewState,
  StateCallback,
  ObjectLiteral,
} from './flow.types';

export class Component implements ComponentInstance {
  $key: any;

  $value: any;

  props: ObjectLiteral;

  state: ?ObjectLiteral;

  context: any;
  isReactComponent: boolean;

  constructor(props: ObjectLiteral) {
    this.props = props;

    this.state = undefined;
    this.context = undefined;

    this[BRAHMOS_DATA_KEY] = {
      lastSnapshot: null,
      pendingSyncUpdates: [],
      pendingDeferredUpdates: [],
      fiber: null,
      nodes: null,
      mounted: false,
      committedValues: {},
      memoizedValues: null,
      isDirty: false,
      renderCount: 0,
    };
  }

  setState(newState: NewState, callback: StateCallback) {
    const shouldRerender = guardedSetState(this, (transitionId) => ({
      state: newState,
      transitionId,
      callback,
    }));

    if (shouldRerender) reRender(this);
  }

  forceUpdate(callback: StateCallback) {
    const brahmosData = this[BRAHMOS_DATA_KEY];

    // if there is no fiber (when component is not mounted) we don't need to do anything
    const { fiber } = brahmosData;
    if (!fiber) return;

    // keep the track of component through which force update is started
    fiber.root.forcedUpdateWith = this;

    this[BRAHMOS_DATA_KEY].isDirty = true;
    reRender(this);
    if (callback) callback(this.state);
  }

  render() {}

  __render() {
    // get the new rendered node
    const nodes = this.render();

    // store the current reference of nodes so we can use this this on next render cycle
    this[BRAHMOS_DATA_KEY].nodes = nodes;
    return nodes;
  }
}

Component.prototype.isReactComponent = true;

export class PureComponent extends Component implements PureComponentInstance {
  isPureReactComponent: boolean;
}

PureComponent.prototype.isPureReactComponent = true;
