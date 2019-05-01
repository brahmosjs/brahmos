export function handleOnChange (e, type, handler, initialState) {
  switch (type) {
    case 'select':
    case 'input': {
      if (initialState !== undefined) {
        e.target.value = initialState;
      }
      break;
    }
    case 'radio':
    case 'checkbox': {
      if (initialState !== undefined) {
        e.target.checked = initialState;
      }
    }
  }

  if (handler) {
    handler(e);
  }
}
