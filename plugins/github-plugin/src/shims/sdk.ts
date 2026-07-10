// At runtime, SDK is available as window.WinotchSDK
const sdk = (window as any).WinotchSDK;

export const usePluginState = sdk.usePluginState;
export const getPluginState = sdk.getPluginState;
export const subscribePluginState = sdk.subscribePluginState;
export const pluginStateActions = sdk.pluginStateActions;
export const secureStorage = sdk.secureStorage;
export const fileStorage = sdk.fileStorage;
export const oauth = sdk.oauth;
export const getActiveTab = sdk.getActiveTab;
export const isWindowFocused = sdk.isWindowFocused;
export const subscribeActiveTab = sdk.subscribeActiveTab;
export const openInBrowser = sdk.openInBrowser;
