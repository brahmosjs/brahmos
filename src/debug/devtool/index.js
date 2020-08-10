export function initDevTools() {
  // rdtHook -> React Devtools hook
  const rdtHook = (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  // the developer has not installed react devtools
  if(rdtHook == null) return;

  catchErrors(() => {
    let isDev = false;
    
    try {
      isDev = process.env.NODE_ENV !== 'production';
    }
    catch {}

    window.parent.postMessage({
      source: 'react-devtools-detector',
      reactBuildType: isDev
        ? 'development'
        : 'production'
    },
    '*');
  })();
}

function catchErrors(fn) {
  return function(...args) {
    try {
      fn(args);
    }
    catch(e) {
      console.error(`React Devtools encountered an error`);
      console.error(e);
    }
  };
}