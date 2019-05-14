const TAG_QUOTE_REGEX = /[<>"]/g;

/**
 * attribute which has expression as value can be
 * Any character except control character space \s and ", followed by =
 * No need to worry about / and = as they are invalid just before a attr name.
 */
const EXPRESSION_ATTR_NAME_REGEX = /([^\s"]*)=$/;

/**
 * attribute name on the string part can be
 * Any character except control character space \s, ", ', =, <
 * followed by = or space or closing tag >
 * and should start after \s or should be the first character
 *
 * Pick the third value on the exec group
 */
const ATTR_NAME_REGEX = /(^|\s)([^\s"'=<]+)(?=[\s=>])/g;

export const attrMarker = 'data-react-lit-attr';
export const marker = '{{react-lit}}';
export const nodeMarker = `<!--${marker}-->`;

function extractAttributeName (str) {
  let result;
  const names = [];
  while ((result = ATTR_NAME_REGEX.exec(str)) !== null) {
    const attrName = result[2];

    if (attrName) {
      names.push(result[2]);
    }
  }
  return names;
}

export default class TemplateResult {
  constructor (strings) {
    this.strings = strings;
  }
  create () {
    if (this.template) return;

    this.partsMeta = this.getPartsMeta();

    this.createTemplate();
  }
  getPartsMeta () {
    const { strings } = this;
    let tagStarted, quoteStart;
    let tagAttrs = [];
    const partsMeta = [];
    /**
     * Loop on the string parts and check for tags on each of the string
     * Ignore tags which is closed without having value/expression part
     * If there is an expression (as an attribute) on a tag,
     * extract all the attribute of it, and keep the expression index.
     * attributes array and expressionIndex
     * will later help to identify what attr/prop to apply.
     */
    for (let i = 0, l = strings.length; i < l; i++) {
      const str = strings[i];

      let result, isAttrValue, isAttribute, isSpreadAttr, attrName, isNode, subStrIndex, subEndIndex;

      while ((result = TAG_QUOTE_REGEX.exec(str)) !== null) {
        /**
         * Once we find < we assume tag is started and we will keep the tagStarted until we find >.
         * On tag start we reset the tag attributes
         */
        if (result[0] === '<' && !quoteStart) {
          tagStarted = true;
          tagAttrs = [];

          // store index of place where tag is started and reset the tag end string
          subStrIndex = result.index;
          subEndIndex = undefined;
        } else if (result[0] === '"') {
          quoteStart = !quoteStart;
        } else if (tagStarted && result[0] === '>' && !quoteStart) {
          tagStarted = false;
          // store index of place where tag is ending
          subEndIndex = result.index;
        }
      }

      // if it has a tag part extract all the attribute names from the string
      if (tagStarted) {
        const subStr = str.substring(subStrIndex || 0, subEndIndex || str.length);

        tagAttrs.push.apply(tagAttrs, extractAttributeName(subStr));
      }

      /**
       * If tag is started the next expression part will be either attribute value
       * or an spread attribute. Otherwise it will be a node expression.
       */
      if (tagStarted) {
        if (str.endsWith('=')) {
          attrName = str.match(EXPRESSION_ATTR_NAME_REGEX)[1];
          isAttrValue = true;
        } else {
          isSpreadAttr = true;
        }
        isAttribute = true;
      } else {
        isNode = true;
      }

      /*
      * Push expression/value metadata to partsMeta,
      * as the expressions value length will be str.length - 1 add check for that.
      */
      if (i < l - 1) {
        partsMeta.push({
          isAttrValue,
          attrName,
          tagAttrs,
          attrIndex: tagAttrs.length,
          isSpreadAttr,
          isAttribute,
          isNode,
        });
      }
    }

    return partsMeta;
  }
  createTemplate () {
    const { partsMeta, strings } = this;
    const template = document.createElement('template');

    let htmlStr = '';

    for (let i = 0, l = strings.length - 1; i < l; i++) {
      let str = strings[i];
      const part = partsMeta[i];
      const { isAttrValue, isSpreadAttr, isNode } = part;

      if (isAttrValue) {
        str = str.replace(EXPRESSION_ATTR_NAME_REGEX, '');
      }

      if (isNode) {
        htmlStr = htmlStr + str + nodeMarker;
      } else if (isAttrValue || isSpreadAttr) {
        htmlStr = htmlStr + str + attrMarker;
      }
    }

    // add the last string
    htmlStr = htmlStr + strings[strings.length - 1];

    template.innerHTML = htmlStr;
    this.template = template;
  }
}
