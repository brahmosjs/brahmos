const jsx = require('@babel/plugin-syntax-jsx').default;

const RESERVED_ATTRIBUTES = {
  key: 1,
  ref: 1,
};

function isHTMLElement (tagName) {
  // Must start with a lowercase ASCII letter
  return !!tagName && /^[a-z]/.test(tagName);
};

const propertyToAttrMap = {
  'className': 'class',
  'htmlFor': 'for',
};

function needsToBeExpression (tagName, attrName) {
  /**
   * TODO: No need to change value attribute of a checkbox or radio button.
   */
  const tags = ['input', 'select', 'textarea'];
  const attributes = ['value', 'defaultValue', 'checked', 'defaultChecked'];
  return RESERVED_ATTRIBUTES[attrName] || (tags.includes(tagName) && attributes.includes(attrName));
}

function BabelPluginBrahmos (babel) {
  const { types: t } = babel;

  function getTaggedTemplateCallExpression (node) {
    const { strings, expressions } = getLiteralParts(node);
    const taggedTemplate = t.taggedTemplateExpression(t.identifier('html'), t.templateLiteral(strings, expressions));
    const callExpression = t.callExpression(taggedTemplate, []);
    return callExpression;
  }

  function getLiteralParts (rootNode, strings = [], expressions = [], stringPart = []) {
    function pushToStrings (tail) {
      const string = stringPart.join('');
      strings.push(t.templateElement({ raw: string, cooked: string }, tail));
      stringPart = [];
    }

    function pushToExpressions (expression) {
      pushToStrings();
      expressions.push(expression);
    }

    function createAttributeExpression (name, value) {
      return t.objectExpression([createObjectProperty(name, value)]);
    }

    function createObjectProperty (name, value) {
      const propName = t.identifier(name.name);
      const propValue = t.isJSXExpressionContainer(value) ? value.expression : value;
      return t.objectProperty(propName, propValue, false, propName.name === propValue.name);
    }

    function recurseNode (node) {
      if (t.isJSXElement(node)) {
        const { openingElement, children } = node;
        const { attributes, name } = openingElement;
        const tagName = name.name;

        if (isHTMLElement(tagName)) {
          // Handle opening tag
          stringPart.push(`<${tagName} `);

          // push all attributes to opening tag
          attributes.forEach(attribute => {
            // if we encounter spread attribute, push the argument as expression
            if (t.isJSXSpreadAttribute(attribute)) {
              pushToExpressions(attribute.argument);
            } else {
              const { name, value } = attribute;
              let attrName = name.name;

              /**
               * check if the attribute should go as expression or the value is and actual expression
               * then push it to expression other wise push it as string part
               */

              if (needsToBeExpression(tagName, attrName) || t.isJSXExpressionContainer(value)) {
                pushToExpressions(createAttributeExpression(name, value));
                // keep space after expressions
                stringPart.push(' ');
              } else {
              /**
               * Check if attrName needs to be changed, to form html attribute like className -> class
               * Change the property name only if the value is string type so at comes along with
               * string part. In case of value is expression we don't need to do it
               */
                attrName = propertyToAttrMap[attrName] || attrName;
                stringPart.push(` ${attrName}${value ? `="${value.value}" ` : ''}`);
              }
            }
          });

          stringPart.push('>');

          // handle children
          children.forEach(child => {
            recurseNode(child);
          });

          // handle closing tag
          stringPart.push(`</${tagName}>`);
        } else {
          const componentName = name;

          // add props
          const props = [];
          attributes.forEach(attribute => {
            if (t.isJSXSpreadAttribute(attribute)) {
              props.push(t.spreadElement(attribute.argument));
            } else {
              const { name, value } = attribute;
              props.push(createObjectProperty(name, value));
            }
          });

          const createElementArguments = [
            t.identifier(componentName.name),
            t.objectExpression(props),
          ];

          if (children && children.length) {
            createElementArguments.push(getTaggedTemplateCallExpression(children));
          }

          const expression = t.callExpression(t.identifier('createElement'), createElementArguments);

          pushToExpressions(expression);
        }
      } else if (t.isJSXText(node)) {
        stringPart.push(node.value);
      } else if (t.isJSXExpressionContainer(node) && !t.isJSXEmptyExpression(node.expression)) {
        pushToExpressions(node.expression);
      } else if (Array.isArray(node)) {
        node.forEach((nodeItem) => recurseNode(nodeItem));
      } else if (t.isJSXFragment(node)) {
        node.children.forEach((nodeItem) => recurseNode(nodeItem));
      }
    }

    recurseNode(rootNode);

    // add the last template element
    pushToStrings(true);

    return {
      strings,
      expressions,
    };
  }

  function visitorCallback (path) {
    const { node } = path;
    const tagExpression = getTaggedTemplateCallExpression(node);
    path.replaceWith(tagExpression);
  }
  return {
    name: 'brahmos',
    inherits: jsx,
    visitor: {
      JSXElement: visitorCallback,
      JSXFragment: visitorCallback,
    },
  };
}

module.exports = BabelPluginBrahmos;
