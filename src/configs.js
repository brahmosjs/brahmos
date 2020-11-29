// @flow
// React element types
// We have to add same type of to support third party plugins
export const REACT_ELEMENT = Symbol.for('react.element');
export const REACT_FORWARD_REF = Symbol.for('react.forward_ref');

// Brahmos placeholder
export const BRAHMOS_PLACEHOLDER = '{{brahmos}}';

// reserved props which cannot be forward to component props
export const RESERVED_ATTRIBUTES = {
  key: 1,
  ref: 1,
};

export const MODIFIED_ATTRIBUTES: { [key: string]: string } = {
  className: 'class',
  htmlFor: 'for',
  acceptCharset: 'accept-charset',
  httpEquiv: 'http-equiv',
  tabIndex: 'tabindex', // tabIndex is supported both on svg and html, but in svg the camelCase does not work. So transform this
};

export const RENAMED_EVENTS = {
  doubleclick: 'dblclick',
};


/**
 * Regex taken from Preact. (https://github.com/preactjs/preact/blob/master/compat/src/render.js)
 */
// Input types for which onchange should not be converted to oninput.
// type="file|checkbox|radio", plus "range" in IE11.
// (IE11 doesn't support Symbol, which we use here to turn `rad` into `ra` which matches "range")
export const ONCHANGE_INPUT_TYPES =
	typeof Symbol !== 'undefined' ? /fil|che|rad/i : /fil|che|ra/i;

export const CAMEL_ATTRIBUTES = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|fill|flood|font|glyph(?!R)|horiz|marker(?!H|W|U)|overline|paint|stop|strikethrough|stroke|text(?!L)|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;


/**
 * Regex taken from Preact. (https://github.com/preactjs/preact/blob/master/src/constants.js)
 */
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i;

/**
 * xlink namespace for svgs
 */
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

export const SUSPENSE_REVEAL_INTERVAL = 100; // in ms

/**
 * Brahmos data key which shouldn't be touched
 */
export const BRAHMOS_DATA_KEY: '__brahmosData' = '__brahmosData';
export const LAST_ARRAY_DOM_KEY: '__brahmosLastArrayDom' = '__brahmosLastArrayDom';
export const ROOT_FIBER_KEY: '__rootFiber' = '__rootFiber';

/** update type related constants */
export const UPDATE_TYPE_SYNC: 'sync' = 'sync';
export const UPDATE_TYPE_DEFERRED: 'deferred' = 'deferred';

/** Update source related constants */
export const UPDATE_SOURCE_DEFAULT: 'js' = 'js';
export const UPDATE_SOURCE_IMMEDIATE_ACTION: 'immediate_action' = 'immediate_action';
export const UPDATE_SOURCE_TRANSITION: 'transition' = 'transition';

/** Effect type ENUMS */
export const EFFECT_TYPE_NONE: 0 = 0;
export const EFFECT_TYPE_PLACEMENT: 1 = 1;
export const EFFECT_TYPE_OTHER: 2 = 2;

/** Transition states */
export const TRANSITION_STATE_INITIAL: 'initial' = 'initial';
export const TRANSITION_STATE_START: 'start' = 'start';
export const TRANSITION_STATE_SUSPENDED: 'suspended' = 'suspended';
export const TRANSITION_STATE_RESOLVED: 'resolved' = 'resolved';
export const TRANSITION_STATE_COMPLETED: 'completed' = 'completed';
export const TRANSITION_STATE_TIMED_OUT: 'timedOut' = 'timedOut';
