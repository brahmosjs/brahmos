/** Component classes,  Suspense and lazy */
import {
  Component,
  PureComponent,
  createElement,
  createBrahmosNode,
  Suspense,
  SuspenseList,
  lazy,
} from './circularDep';

import { html } from './tags';

/** render methods */
import render from './render';

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

/** import top level api */
import { Children, isValidElement, cloneElement } from './Children';

import memo from './memo';

export {
  createElement,
  render,
  Component,
  PureComponent,
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
  Children,
  isValidElement,
  cloneElement,
  deferredUpdates as unstable_deferredUpdates,
  syncUpdates as unstable_syncUpdates,
  memo,
};

/** Export transforms */
export const jsx = createBrahmosNode;
export const jsxs = createBrahmosNode;
export const jsxDev = createBrahmosNode;
export { html };