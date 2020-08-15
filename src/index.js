/** Component classes,  Suspense and lazy */
import {
  Component,
  PureComponent,
  createElement,
  Suspense,
  SuspenseList,
  lazy,
} from './circularDep';

/** render methods */
import render from './render';

/** React lit tags */
import { html } from './tags';

/** Portal */
import createPortal from './createPortal';

/** Hooks */
import {
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback,
  useLayoutEffect,
  useContext,
  useTransition,
  useDeferredValue,
} from './hooks';

/** createContext */
import createContext from './createContext';

/** ForwardRef and createRef */
import { forwardRef, createRef } from './refs';

/** unmountComponentAtNode */
import unmountComponentAtNode from './unmountComponentAtNode';

/** unstableBatchedUpdate */
import { deferredUpdates, syncUpdates } from './updateUtils';

const Brahmos = {
  createElement,
  render,
  Component,
  PureComponent,
  html,
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback,
  useLayoutEffect,
  useContext,
  useTransition,
  useDeferredValue,
  createContext,
  forwardRef,
  createRef,
  createPortal,
  unmountComponentAtNode,
  Suspense,
  SuspenseList,
  lazy,
  unstable_deferredUpdates: deferredUpdates,
  unstable_syncUpdates: syncUpdates,
};

export {
  createElement,
  render,
  Component,
  PureComponent,
  html,
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback,
  useLayoutEffect,
  useContext,
  useTransition,
  useDeferredValue,
  createContext,
  forwardRef,
  createRef,
  createPortal,
  unmountComponentAtNode,
  Suspense,
  SuspenseList,
  lazy,
  deferredUpdates as unstable_deferredUpdates,
  syncUpdates as unstable_syncUpdates,
};

export default Brahmos;
