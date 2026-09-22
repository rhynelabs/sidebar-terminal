declare module 'electron' {
  export const clipboard: { readText(): string; writeText(text: string): void };
  export const shell: { openExternal(url: string): Promise<void> };
}
