// At runtime, React JSX runtime is available via window.React
const React = (window as any).React;

export function jsx(type: any, props: any, key?: any) {
  const { children, ...rest } = props || {};
  const finalProps = key !== undefined ? { ...rest, key } : rest;

  if (children !== undefined) {
    if (Array.isArray(children)) {
      return React.createElement(type, finalProps, ...children);
    }
    return React.createElement(type, finalProps, children);
  }
  return React.createElement(type, finalProps);
}

export const jsxs = jsx;
export const Fragment = React.Fragment;
