import type { ReactNode } from 'react';

export function MarkdownRenderer({ children }: { children: ReactNode }) {
  return <section className="markdown-body">{children}</section>;
}
