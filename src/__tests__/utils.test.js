import {
  isHTMLElement,
  isEventAttribute,
  getNodeName,
  getEventName,
  isCustomElement,
} from '../utils';

describe('Test utility functions', () => {
  describe('Test isHTMLElement', () => {
    it('should return true for valid HTML element tag', () => {
      expect(isHTMLElement('a')).toBe(true);
      expect(isHTMLElement('span')).toBe(true);
      expect(isHTMLElement('div')).toBe(true);
    });

    it('should return false for invalid HTML element tag', () => {
      expect(isHTMLElement('CustomComponent')).toBe(false);
      expect(isHTMLElement('_Component')).toBe(false);
    });
  });

  describe('Test isEventAttribute', () => {
    it('should return true if valid event attribute', () => {
      expect(isEventAttribute('onChange')).toBe(true);
      expect(isEventAttribute('onLoad')).toBe(true);
      expect(isEventAttribute('onHover')).toBe(true);
    });

    it('should return false if invalid event attribute', () => {
      expect(isEventAttribute('change')).toBe(false);
      expect(isEventAttribute('load')).toBe(false);
      expect(isEventAttribute('hover')).toBe(false);
    });
  });

  describe('Test getNodeName', () => {
    it('should return name of the current node', () => {
      const node = document.createElement('a');
      expect(getNodeName(node)).toBe('a');

      const text = document.createTextNode('some text');
      expect(getNodeName(text)).toBe('#text');
    });
  });

  describe('Test getEventName', () => {
    it('should return event name from handler attribute', () => {
      expect(getEventName('onChange')).toBe('change');
      expect(getEventName('onKeyDown')).toBe('keydown');
    });
  });

  describe('Test isCustomElement', () => {
    it('should return true for custom web components', () => {
      expect(isCustomElement('web-component')).toBe(true);
    });

    it('should return false for components and native elements', () => {
      expect(isCustomElement('span')).toBe(false);
      expect(isCustomElement('MyComponent')).toBe(false);
    });
  });
});
