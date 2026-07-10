// At runtime, React is available as window.React
const React = (window as any).React;
export default React;
export const useState = React.useState;
export const useEffect = React.useEffect;
export const useMemo = React.useMemo;
export const useRef = React.useRef;
export const useCallback = React.useCallback;
