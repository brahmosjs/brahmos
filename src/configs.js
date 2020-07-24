// reserved props which cannot be forward to component props
export const RESERVED_ATTRIBUTES = {
  key: 1,
  ref: 1,
};

export const MODIFIED_ATTRIBUTES = {
  className: 'class',
  htmlFor: 'for',
  acceptCharset: 'accept-charset',
  httpEquiv: 'http-equiv',
};

export const RENAMED_EVENTS = {
  doubleclick: 'dblclick',
};

export const SUSPENSE_REVEAL_INTERVAL = 100; // in ms

/**
 * Regex taken from Preact. (https://github.com/preactjs/preact/blob/master/src/constants.js)
 */
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i;

/**
 * xlink namespace for svgs
 */
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Brahmos data key which shouldn't be touched
 */
export const BRAHMOS_DATA_KEY = '__brahmosData';
export const LAST_ARRAY_DOM_KEY = '__brahmosLastArrayDom';

/** update type related constants */
export const UPDATE_TYPE_SYNC = 'sync';
export const UPDATE_TYPE_DEFERRED = 'deferred';

/** Update source related constants */
export const UPDATE_SOURCE_DEFAULT = 'js';
export const UPDATE_SOURCE_EVENT = 'event';
export const UPDATE_SOURCE_UNSTABLE_DEFERRED = 'deferredUpdate';
export const UPDATE_SOURCE_TRANSITION = 'transition';
