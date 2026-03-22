export {};

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown> | string | number>;
    gtag: (...args: Gtag.Command) => void;
  }

  namespace Gtag {
    type Command =
      | ["js", Date]
      | ["config", string, Record<string, unknown>?]
      | ["event", string, Record<string, unknown>?];
  }
}
