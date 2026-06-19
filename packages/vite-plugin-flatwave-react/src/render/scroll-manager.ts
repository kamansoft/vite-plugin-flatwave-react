export class ScrollManager {
  private scrollPositions: Map<string, number> = new Map();

  saveScrollPosition(path: string): void {
    this.scrollPositions.set(path, window.scrollY);
  }

  restoreScrollPosition(path: string): void {
    const saved = this.scrollPositions.get(path);
    if (saved !== undefined) {
      window.scrollTo(0, saved);
    } else {
      this.scrollToTop();
    }
  }

  scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  clear(): void {
    this.scrollPositions.clear();
  }

  getSavedPosition(path: string): number | undefined {
    return this.scrollPositions.get(path);
  }
}
