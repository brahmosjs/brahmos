// @flow
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

export function parseStatic(strings) {
  const elmStack = [];
  let insideTagOpenElem = false;
  let currentElm;
  let tree;

  const addToRoot = (child) => {
    if (!tree) {
      tree = child;
    } else if (Array.isArray(tree)) {
      tree.push(child);
    } else {
      tree = [tree, child];
    }
  };

  const addToProps = (props, child) => {
    if (!props.children) {
      props.children = child;
    } else if (Array.isArray(props.children)) {
      props.children.push(child);
    } else {
      props.children = [props.children, child];
    }
  };

  const pushToParent = (child) => {
    const parentElm = elmStack[elmStack.length - 1];

    if (parentElm) {
      addToProps(parentElm.props, child);
    } else {
      addToRoot(child);
    }
  };

  const pushChildren = () => {
    insideTagOpenElem = false;
    pushToParent(currentElm);
    if (!SELF_CLOSING_TAGS.includes(currentElm.type)) {
      elmStack.push(currentElm);
    }
  };

  const pushDynamicPart = (index) => {
    const dynamicInfo = {
      $$BrahmosDynamicPart: index,
    };

    if (!currentElm) {
      addToRoot(dynamicInfo);
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
      regex.lastIndex = i;
      const result = regex.exec(str);

      if (result) {
        i = regex.lastIndex;
      }

      return result;
    };

    const getAttributeValue = (quoteRegex) => {
      quoteRegex.lastIndex = i + 2;
      const result = quoteRegex.exec(str);
      i = quoteRegex.lastIndex + 1;
      return result[0];
    };

    while (i < ln) {
      if (str[i] === '<' && str[i + 1] === '/') {
        elmStack.pop();
        regexSearch(TAG_END_REGEX);
        continue;
      } else if (str[i] === '<' && str[i + 1] === '!') {
        regexSearch(COMMENT_REGEX);
        continue;
      } else if (str[i] === '<') {
        // set the lastIndex of regex, so it starts matching from given index
        const result = regexSearch(TAG_REGEX);
        tag = result[1];

        currentElm = {
          type: tag,
          props: {},
        };

        insideTagOpenElem = true;
        continue;
      } else if (str[i] === ' ' && insideTagOpenElem) {
        ATTR_REGEX.lastIndex = i;
        const result = regexSearch(ATTR_REGEX);
        let attrName;
        let attrValue;
        if (result) {
          attrName = result[1];

          if (str[i] !== '=') {
            attrValue = true;
          } else if (str[i + 1] === `"`) {
            attrValue = getAttributeValue(DOUBLE_QUOTE_REGEX);
          } else if (str[i + 1] === `'`) {
            attrValue = getAttributeValue(SINGLE_QUOTE_REGEX);
          }

          if (attrName) {
            currentElm.props[attrName] = attrValue;
          }
          continue;
        }
      } else if (str[i] === '>' && insideTagOpenElem) {
        pushChildren();
      } else if (!insideTagOpenElem) {
        const result = regexSearch(STRING_CHILDREN_REGEX);
        pushToParent(result[0]);
        continue;
      }
      i++;
    }

    pushDynamicPart(index);
  });

  return tree;
}

const { hasOwnProperty } = Object.prototype;

function apply(tree, values) {
  if (tree == null || typeof tree !== 'object') {
    return tree;
  }

  let temp = new tree.constructor();

  for (var key in tree) {
    if (hasOwnProperty.call(tree, key)) {
      const node = tree[key];
      const valueIndex = node && node.$$BrahmosDynamicPart;
      if (valueIndex !== undefined) {
        const value = values[valueIndex];
        if (key[0] === '$') {
          temp = Object.assign(temp, value);
        } else {
          temp[key] = value;
        }
      } else {
        temp[key] = apply(tree[key], values);
      }
    }
  }

  return temp;
}

export default function parseChildren(node) {
  const { values, template } = node;
  const { strings } = template;
  if (!template.staticTree) {
    template.staticTree = parseStatic(strings);
  }

  return apply(template.staticTree, values);
}
