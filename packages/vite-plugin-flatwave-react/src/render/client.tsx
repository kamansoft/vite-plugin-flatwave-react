import { createRenderController, RenderController } from './controller.js';
import type { RenderControllerOptions } from './types.js';
import { Navigation } from './navigation.js';
import { ScrollManager } from './scroll-manager.js';

let renderController: RenderController | null = null;

export interface StartRenderLoopOptions extends RenderControllerOptions {}

export function startRenderLoop(options: StartRenderLoopOptions): RenderController {
  if (renderController) {
    console.warn('[flatwave] Render loop already started. Call destroy() first if you need to restart.');
    return renderController;
  }

  renderController = createRenderController(options);
  renderController.start();
  
  return renderController;
}

export function destroyRenderLoop(): void {
  if (renderController) {
    renderController.destroy();
    renderController = null;
  }
}

export function getRenderController(): RenderController | null {
  return renderController;
}

export function getCurrentPath(): string {
  return renderController?.getCurrentPath() ?? window.location.pathname;
}

export function navigateTo(path: string): void {
  renderController?.navigate(path);
}

export function onNavigate(callback: (path: string) => void): () => void {
  const nav = new Navigation({
    onNavigate: callback,
  });
  nav.start();
  return () => nav.destroy();
}

export function getPageContext(): ReturnType<RenderController['getCurrentPageContext']> {
  return renderController?.getCurrentPageContext() ?? null;
}

export function useFlatwaveRoute() {
  const route = renderController?.getCurrentPageContext()?.route;
  return route;
}