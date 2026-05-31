declare module "@plantuml/core" {
  export function render(
    lines: string[],
    targetId: string,
    options?: { dark?: boolean },
  ): void;

  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (errorMessage: string) => void,
    options?: { dark?: boolean },
  ): void;
}

declare module "@plantuml/core/viz-global.js?url" {
  const url: string;
  export default url;
}

interface Window {
  Viz?: {
    instance(): Promise<{
      renderString(src: string, options?: { format?: string; engine?: string }): string;
    }>;
  };
}
