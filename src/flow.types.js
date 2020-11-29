// @flow
import typeof {
  LAST_ARRAY_DOM_KEY,
  ROOT_FIBER_KEY,
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_SYNC,
  UPDATE_TYPE_DEFERRED,
  UPDATE_SOURCE_DEFAULT,
  UPDATE_SOURCE_IMMEDIATE_ACTION,
  UPDATE_SOURCE_TRANSITION,
  TRANSITION_STATE_INITIAL,
  TRANSITION_STATE_START,
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_RESOLVED,
  TRANSITION_STATE_COMPLETED,
  TRANSITION_STATE_TIMED_OUT,
  EFFECT_TYPE_NONE,
  EFFECT_TYPE_PLACEMENT,
  EFFECT_TYPE_OTHER,
} from './configs';

/** Extend dom type */
export type ExtendedElement = Element & {
  [key: LAST_ARRAY_DOM_KEY | ROOT_FIBER_KEY]: any,
};

/** Utility types */
export type ObjectLiteral = { [key: string]: any };
export type ArrayCallback = (child: any, index: number, array: Array<any>) => any;

/** Effect type */
export type EffectType = EFFECT_TYPE_NONE | EFFECT_TYPE_PLACEMENT | EFFECT_TYPE_OTHER;

/** Error Type */
export type ErrorInfo = { componentStack: string };

/** Update types */
export type UpdateType = UPDATE_TYPE_SYNC | UPDATE_TYPE_DEFERRED;

export type UpdateSource =
  | UPDATE_SOURCE_DEFAULT
  | UPDATE_SOURCE_IMMEDIATE_ACTION
  | UPDATE_SOURCE_TRANSITION;

/** Update types end */

/** Part types */
export type PartMeta = {|
  tagAttrs?: Array<string>,
  attrIndex: number,
  isAttribute: boolean,
  refNodeIndex: number,
  prevChildIndex: number,
  hasExpressionSibling: boolean,
|};

export type AttributePart = {|
  isAttribute: true,
  domNode: ExtendedElement,
  tagAttrs: Array<string>,
  attrIndex: number,
|};

export type NodePart = {|
  isNode: boolean,
  parentNode: ExtendedElement,
  previousSibling: ?Node,
|};

export type ArrayPart = {|
  isArrayNode: boolean,
  parentNode: ExtendedElement,
  previousSibling: ?Node,
  nodeIndex: number,
  firstDOMNode?: Node,
  parentArrayPart?: ArrayPart,
|};

export type Part = AttributePart | NodePart | ArrayPart;

/** Part types end */

/** Transition types */
export type TransitionState =
  | TRANSITION_STATE_INITIAL
  | TRANSITION_STATE_START
  | TRANSITION_STATE_SUSPENDED
  | TRANSITION_STATE_RESOLVED
  | TRANSITION_STATE_COMPLETED
  | TRANSITION_STATE_TIMED_OUT;

export type PredefinedTransition = {|
  transitionId: string,
  tryCount: number,
  transitionState: TRANSITION_STATE_TIMED_OUT,
|};

export type Transition = {|
  transitionId: string,
  tryCount: number,
  transitionTimeout: ?TimeoutID,
  transitionState: TransitionState,
  isPending: boolean,
  // eslint-disable-next-line no-use-before-define
  pendingSuspense: Array<SuspenseInstance>,
  clearTimeout: () => void,
  updatePendingState: (isPending: boolean, updateSource: UpdateSource) => void,
  startTransition: (cb: Function) => void,
|};

export type AnyTransition = Transition | PredefinedTransition;
/** Transition types end */

/** Refs type */
export type ObjectRef = { current: any };
export type FunctionalRef = (ref: any) => void;
export type Ref = ObjectRef | FunctionalRef;

/** Template interface */
export interface TemplateTagType {
  [key: 'svgTemplate' | 'template']: ?HTMLTemplateElement;
  template: ?HTMLTemplateElement;
  svgTemplate: ?HTMLTemplateElement;
  strings: Array<string>;
  partsMeta: Array<PartMeta>;
  partMetaCode: string;
  staticTree: any;
  +create: (isSvgPart: boolean) => void;
}

export interface TemplateNodeType {
  templateResult: TemplateTagType;
  fragment: DocumentFragment;
  parts: Array<Part>;
  domNodes: Array<Node>;
  patched: boolean;

  +patchParts: (nodePart: NodePart) => void;
}

export interface TagNodeType {
  fragment: Array<Node>;
  parts: Array<Part>;
  domNodes: Array<Node>;
}
/** Template interface end */

/** Brahmos Node type */
export type BrahmosNode = {|
  $$typeof: symbol,
  nodeType: ?symbol,
  key?: number | string,
  ref: ?Ref,
  portalContainer: ?ExtendedElement,
  type: Function,
  props: ?ObjectLiteral,
  values: ?Array<any>,
  template: ?TemplateTagType,
|};
/** Brahmos Node type end */

/** Fiber types */
export type Fiber = {|
  node: any,
  nodeInstance: any,
  // eslint-disable-next-line no-use-before-define
  root: HostFiber,
  parent: Fiber,
  child: ?Fiber,
  sibling: ?Fiber,
  part: any,
  alternate: ?Fiber,
  // eslint-disable-next-line no-use-before-define
  context: ?AllContext,
  childFiberError: ?{ error: Error, errorInfo: ErrorInfo },
  isSvgPart: boolean,
  deferredUpdateTime: number,
  updateTime: number,
  processedTime: number,
  createdAt: number,
  shouldTearDown: boolean,
  hasUncommittedEffect: EffectType,
|};

export type HostFiber = {|
  updateType: UpdateType,
  updateSource: UpdateSource,
  cancelSchedule: Function,
  domNode: ExtendedElement,
  forcedUpdateWith: ?Fiber,
  current: Fiber,
  wip: ?Fiber,
  child: ?Fiber,
  retryFiber: ?Fiber,
  currentTransition: ?AnyTransition,
  hasUncommittedEffect: boolean,
  pendingTransitions: Array<AnyTransition>,
  tearDownFibers: Array<Fiber>,
  postCommitEffects: Array<Fiber>,
  batchUpdates: { [key: string]: number },
  lastDeferredCompleteTime: number,
  lastCompleteTime: number,
  deferredUpdateTime: number,
  updateTime: number,
  afterRender: (cb: Function) => void,
  callRenderCallbacks: () => void,
  resetRenderCallbacks: () => void,
|};
/** Fiber types end */

/** NodeInstance Interfaces */

export type ComponentBrahmosData = {|
  pendingSyncUpdates: Array<Function>,
  pendingDeferredUpdates: Array<Function>,
  fiber: ?Fiber,
  nodes: any,
  isDirty: boolean,
  mounted: boolean,
  renderCount: number,
|};

type CommittedValues = {
  props: ObjectLiteral,
  state: ?ObjectLiteral,
};

type MemoizedValues = ?{
  props: ObjectLiteral,
  state: ?ObjectLiteral,
  transitionId: string,
};

export type ClassComponentBrahmosData = {|
  ...ComponentBrahmosData,
  committedValues: CommittedValues,
  memoizedValues: MemoizedValues,
|};

export type NewState = Object | ((state: ?ObjectLiteral) => Object);
export type StateCallback = (state: ?ObjectLiteral) => void;

export interface ComponentInstance {
  props: ObjectLiteral;
  state: ?ObjectLiteral;
  context: any;
  [key: BRAHMOS_DATA_KEY]: ClassComponentBrahmosData;
  +setState: (newState: NewState, callback: StateCallback) => void;
  +forceUpdate: (callback: () => void) => void;
  componentDidMount?: () => void;
  shouldComponentUpdate?: (nextProps: ObjectLiteral, nextState: ?ObjectLiteral) => boolean;
  getSnapshotBeforeUpdate?: (prevProps: ObjectLiteral, prevState: ?ObjectLiteral) => void;
  componentDidUpdate?: (prevProps: ObjectLiteral, prevState: ?ObjectLiteral, snapshot: any) => void;
  componentDidCatch?: (error: Error, info: ErrorInfo) => void;
  componentWillUnmount?: () => void;
  +render: () => any;
  +__render: () => any;
}

export interface PureComponentInstance extends ComponentInstance {
  isPureReactComponent: boolean;
}

export type SuspenseProps = {
  fallback: any,
};

export type SuspenseListProps = {
  revealOrder: 'forwards' | 'backwards' | 'together',
  tail: 'collapsed' | 'hidden',
};

export interface SuspenseInstance extends ComponentInstance {
  props: SuspenseProps;
  suspenseManagers: ObjectLiteral;
  +handleSuspender: (Promise<any>, Fiber) => void;
}

export interface SuspenseListInstance extends ComponentInstance {
  props: SuspenseListProps;
  suspenseManagers: ObjectLiteral;
}

export interface ProviderInstance extends ComponentInstance {
  subs: Array<(providerValue: any) => void>;
  // eslint-disable-next-line no-use-before-define
  sub: (componentInstance: ComponentClassInstance) => void;
}

export type FunctionalComponentInstance = {
  syncHooks: Array<any>,
  deferredHooks: Array<any>,
  pointer: number,
  context: any,
  __render: (props: ObjectLiteral) => any,
  [key: BRAHMOS_DATA_KEY]: ComponentBrahmosData,
};

export type ComponentClassInstance =
  | ComponentInstance
  | PureComponentInstance
  | SuspenseInstance
  | SuspenseListInstance;

export type AnyComponentInstance = ComponentClassInstance | FunctionalComponentInstance;

export type FunctionalComponent = {
  (props: ObjectLiteral, ref: ?Ref): any,
  displayName: ?string,
  __loadLazyComponent: ?() => void,
};

export type ClassComponent = {
  getDerivedStateFromProps: (props: ObjectLiteral, state: ?ObjectLiteral) => ObjectLiteral | null,
  getDerivedStateFromError: (error: Error) => ObjectLiteral | null,
  displayName: ?string,
  name: string,
  prototype: ComponentClassInstance,
};

export type ProviderClassType = ClassComponent & {
  __ccId: string,
};

export type NodeInstance = AnyComponentInstance | TemplateNodeType;
/** NodeInstance Interfaces end */

/** Context type */
export type ContextType = {
  id: string,
  defaultValue: any,
  Provider: ProviderClassType,
  Consumer: ClassComponent,
};

export type AllContext = { [key: string]: ProviderInstance };

/** Update types */
export type ClassComponentUpdate = {
  transitionId: string,
  state: NewState,
  callback: StateCallback,
};

export type FunctionalComponentUpdate = {
  transitionId: string,
  updater: () => void,
};

export type PendingUpdates = Array<ClassComponentUpdate> | Array<FunctionalComponentUpdate>;
