import BabelPluginSyntaxJsx from '@babel/plugin-syntax-jsx';
import { isHTMLElement, isEventAttribute, isBooleanAttribute, isCustomElement } from './utils';

function convertJSXExpressionToLiteralExpression (node) {

}

function extractNodeAndAttributes (node, t) {
  const element = node.openingElement;
  const tagNameNode = element.name;
  const isHTMLTag = isHTMLElement(tagNameNode.name);
  const iCustomElement = isCustomElement(tagNameNode.name);
  const attributes = element.attributes.map((attribute) => {
    const isSpreadAttribute = t.isJSXSpreadAttribute(attribute);

    if (isSpreadAttribute) {
      return {
        isSpreadAttribute: true,
        object: attribute.argument,
      };
    }

    const { name: attrNameNode, value: attrValueNode } = attribute;
    const hasExpressionValue = t.isJSXExpressionContainer(attrValueNode);

    const attributeMeta = {
      name: attrNameNode,
      value: attrValueNode,
      hasExpressionValue,
    };

    if (isHTMLTag && !iCustomElement) {
      attributeMeta.isEvent = isEventAttribute(attrNameNode.name);
      attributeMeta.isBoolean = isBooleanAttribute(attrNameNode.name);
    }

    return attributeMeta;
  });

  return {
    tagName: tagNameNode,
    attributes,
    isHTMLTag,
    iCustomElement,
  };
};

function transform ({
  path,
  node,
  t,
  state,
}) {
  console.log(state);
  console.log(path.node.openingElement.name.name);
}

export default function babelPluginReactLit (api) {
  api.assertVersion(7);
  const t = api.types;

  return {
    inherits: BabelPluginSyntaxJsx,
    visitor: {
      JSXElement (path, state) {
        transform({ path, t, state });

        // path.replaceWith(transformElement(renderElement(path.node)));
      },
      JSXFragment (path) {
        // console.log(path);
        // path.replaceWith(transformElement(renderElement(path.node)));
      },
    },
  };
}
