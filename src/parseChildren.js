// @flow

import { TAG_ELEMENT_NODE } from './brahmosNode';
import { REACT_ELEMENT } from './configs';
import type { BrahmosNode, TemplateTagType } from './flow.types';

const TAG_REGEX = /<([^\s"'=<>/]+)/g;

const ATTR_REGEX = /\s*([^\s"'=<>/]*)/g;

const DOUBLE_QUOTE_REGEX = /[^"]*/g;
const SINGLE_QUOTE_REGEX = /[^"]*/g;

const TAG_END_REGEX = /<\/([^\s"'=<>]+)>/g;

const STRING_CHILDREN_REGEX = /[^<]*/g;

const COMMENT_REGEX = /<!--.*?-->/g;

const SELF_CLOSING_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
];

/**
 * Convert static string to dynamic nodes
 */
function parseStatic(strings: Array<string>) {
  const elmStack = [];
  let insideTagOpenElem = false;
  let currentElm;
  const rootProps = {};

  const addToProps = (props, child) => {
    if (!props.children) {
      // if there isn't a children, child becomes the only children
      props.children = child;
    } else if (Array.isArray(props.children)) {
      props.children.push(child);
    } else {
      // if node has single children create a array of child
      props.children = [props.children, child];
    }
  };

  const pushToParent = (child) => {
    const parentElm = elmStack[elmStack.length - 1];

    // if there is any element in stack use that as parent or else add on root.
    addToProps(parentElm ? parentElm.props : rootProps, child);
  };

  /**
   * Method to handle the children on close of opening element
   */
  const pushChildren = () => {
    insideTagOpenElem = false;

    pushToParent(currentElm);

    /**
     * If the element is not self closing tag, add it in stack
     * We don't need to do it for self closing tags because they don't have any child
     */
    if (!SELF_CLOSING_TAGS.includes(currentElm.type)) {
      elmStack.push(currentElm);
    }
  };

  /** Function to add a dynamic part information,
   * so dynamic parts can be applied on the static tree
   * */
  const pushDynamicPart = (index) => {
    const dynamicInfo = {
      $$BrahmosDynamicPart: index,
    };

    // if we are inside tag opening element, we need to add dynamic part in attribute otherwise as child
    if (!currentElm) {
      addToProps(rootProps, dynamicInfo);
    } else if (insideTagOpenElem) {
      currentElm.props[`$$BrahmosDynamicPart${index}`] = dynamicInfo;
    } else {
      addToProps(currentElm.props, dynamicInfo);
    }
  };

  strings.forEach((str, index) => {
    const ln = str.length;
    let tag;
    let i = 0;

    const regexSearch = (regex) => {
      // start searching from last index
      regex.lastIndex = i;
      const result = regex.exec(str);

      // if we find a result set the index to regex last index
      if (result) {
        i = regex.lastIndex;
      }

      return result;
    };

    const getAttributeValue = (quoteRegex) => {
      /**
       * We need to start searching from i + 2 to accommodate =' or ="
       */
      quoteRegex.lastIndex = i + 2;
      const result = quoteRegex.exec(str);

      // after successful search of value we need to set the i to lastIndex + 1 to accommodate ' or "
      i = quoteRegex.lastIndex + 1;
      /**
       * $FlowFixMe: We are running on a valid transform template,
       * so the regex will always have value on this logic
       */
      return result[0];
    };

    while (i < ln) {
      if (str[i] === '<' && str[i + 1] === '/') {
        /**
         * when we see </ on the string, it means we are closing a tag.
         * In such case remove the current element from stack and also
         * set the index to end of the closing tag.
         */
        elmStack.pop();
        regexSearch(TAG_END_REGEX);
        continue;
      } else if (str[i] === '<' && str[i + 1] === '!') {
        /**
         * if we see <! it means we got a comment node, ignore the whole comment node
         * Set the index to end of the comment node
         */
        regexSearch(COMMENT_REGEX);
        continue;
      } else if (str[i] === '<') {
        /**
         * Or else if we just get < it means we are inside opening element.
         * In this case get the tag name, create a current element and mark we
         * are inside opening element, so that the next part are treated as attributes
         * unless we encounter >
         */
        const result = regexSearch(TAG_REGEX);
        // $FlowFixMe: the result will be always be there here as the JSX transformation will have valid html
        tag = result[1];

        currentElm = {
          $$typeof: REACT_ELEMENT,
          type: tag,
          nodeType: TAG_ELEMENT_NODE,
          props: {},
        };

        insideTagOpenElem = true;
        continue;
      } else if (str[i] === ' ' && insideTagOpenElem) {
        // If we encounter an empty space there is chance that we may get attribute next
        ATTR_REGEX.lastIndex = i;
        const result = regexSearch(ATTR_REGEX);
        let attrName;
        let attrValue;

        /**
         * If we got an attribute, get the attribute value and
         * associate the attribute name and value to currentElement
         */
        if (result) {
          attrName = result[1];

          if (str[i] !== '=') {
            // if there is no = followed by attribute name, it means its a boolean attribute with value true
            attrValue = true;
          } else if (str[i + 1] === `"`) {
            // if attribute name is followed by =" find the value between double quote
            attrValue = getAttributeValue(DOUBLE_QUOTE_REGEX);
          } else if (str[i + 1] === `'`) {
            // if attribute name is followed by =' find the value between single quote
            attrValue = getAttributeValue(SINGLE_QUOTE_REGEX);
          }

          if (attrName) {
            currentElm.props[attrName] = attrValue;
          }
          continue;
        }
      } else if (str[i] === '>' && insideTagOpenElem) {
        /**
         * If we encounter > and are inside tag opening element,
         * we are done with attributes, and we have start procession the children now
         * We also add the currentElement on stack so children have information about the parent hierarchy.
         */
        pushChildren();
      } else if (!insideTagOpenElem) {
        const result = regexSearch(STRING_CHILDREN_REGEX);
        // $FlowFixMe: regex search will always return something either empty string or some text data
        pushToParent(result[0]);
        continue;
      }
      i++;
    }

    pushDynamicPart(index);
  });

  return rootProps.children;
}

const { hasOwnProperty } = Object.prototype;

/**
 * function to merge dynamic values in static tree.
 * It creates clones and replaces placeholders by dynamic values
 */
function apply(tree: any, values) {
  if (tree == null || typeof tree !== 'object') {
    return tree;
  }

  let newTree = new tree.constructor();

  // for objects/arrays create clone
  for (var key in tree) {
    if (hasOwnProperty.call(tree, key)) {
      const node = tree[key];
      const valueIndex = node && node.$$BrahmosDynamicPart;
      /**
       * If we get a dynamic place holder check if its an attribute
       * If its an attribute we want to merge the dynamic part with other attributes,
       * or else we replace the placeholder by dynamic value
       */
      if (valueIndex !== undefined) {
        const value = values[valueIndex];
        if (key[0] === '$') {
          newTree = Object.assign(newTree, value);
        } else {
          newTree[key] = value;
        }
      } else {
        newTree[key] = apply(tree[key], values);
      }
    }
  }

  return newTree;
}

export default function parseChildren(node: BrahmosNode): BrahmosNode {
  // $FlowFixMe: Only template nodes are passed in this function
  const { values, template }: { values: Array<any>, template: TemplateTagType } = node;
  const { strings } = template;
  if (!template.staticTree) {
    template.staticTree = parseStatic(strings);
  }

  return apply(template.staticTree, values);
}
