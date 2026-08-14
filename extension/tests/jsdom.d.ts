declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: unknown);
    readonly window: { document: Document };
  }
}
