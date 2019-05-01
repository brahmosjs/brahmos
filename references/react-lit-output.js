function Test () {
  return html`
    <div class="something" test=${`abc${asd}`} contenteditable=${contentEditable} ${spreadProps({ a: 2, b: 3 })}>
      <div>${'Hello < World'}</div>
      ${
  React.createElement(Test, {
    some: [],
    test: 'asdasd',
    blot: { a: 2 },
  })
}
      ${
  html`
          <div>Hello world again</div>
        `
}
      ${
  'abc'
}
      ${
  ['asd', ' ', html`<a>asd</a>`]
}
    </div>
  `;
}

function Test () {
  return {
    template,
    expressions: [
      'abcasd',
      true,
      { a: 2, b: 3, __$isReactLitSpread__: true },
      {
        type: Test,
        props: {},
        key: null,
        ref: null,
        __$isReactLitComponent$__: true,
      },
      {
        template,
        expressions: [],
        __$isReactLitTag$__: true,
      },
      'abc',
      ['asd', ' ', {
        template,
        expressions: [],
        __$isReactLitTag$__: true,
      }],
    ],
    key: null,
    ref: null,
    __$isReactLitTag$__: true,
  };
}

<div class="something" test={`abc${asd}`} contentEditable={contentEditable} {...{ a: 2, b: 3 }}>
  <Test some={[]} test="asdasd" blot={{ a: 2 }}/>
  {<div>{'Hello < World'}</div>}
  {'asdsdd'}
  {['asd', ' ', <a>asd</a>]}
</div>;
