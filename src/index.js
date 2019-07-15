import createElement from './createElement';
import createPortal from './createPortal';

import render from './render';

/** Component classes */
import { Component, PureComponent } from './Component';

/** React lit tags */
import { html } from './tags';

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
} from './hooks';

/** createContext */
import createContext from './createContext';

/** ForwardRef and createRef */
import { forwardRef, createRef } from './refs';

/** unmountComponentAtNode */
import unmountComponentAtNode from './unmountComponentAtNode';

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
  createContext,
  forwardRef,
  createRef,
  createPortal,
  unmountComponentAtNode,
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
  createContext,
  forwardRef,
  createRef,
  createPortal,
  unmountComponentAtNode,
};

export default Brahmos;
