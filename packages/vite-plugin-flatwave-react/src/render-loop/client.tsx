import { hydrateRoot } from 'react-dom/client';
import { NavigationController } from './navigation';
import type { PageContext } from './types';

export interface ClientApp {
  render: (path: string, pageContext: PageContext) => void;
}

let app: ClientApp | null = null;

export function initializeApp(appInstance: ClientApp): void {
  app = appInstance;
}

export async function startRenderLoop(): Promise<void> {
  if (!app) {
    console.error('App not initialized. Call initializeApp() first.');
    return;
  }

  const controller = new NavigationController({
    scrollToTop: true,
  });

  controller.start((path, pageContext) => {
    app!.render(path, pageContext);
  });
}
