import type { InputSnapshot } from '../types';

export class InputManager {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private consumed = new Set<string>();

  private keydownHandler = (e: KeyboardEvent) => {
    // Prevent scrolling with arrow keys / space
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
    if (!this.keys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.keys.add(e.code);
  };

  private keyupHandler = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.consumed.delete(e.code);
  };

  // Touch → treat as Space
  private touchstartHandler = (e: TouchEvent) => {
    e.preventDefault(); // prevent scroll / zoom
    if (!this.keys.has('Space')) {
      this.justPressed.add('Space');
    }
    this.keys.add('Space');
  };

  private touchendHandler = (e: TouchEvent) => {
    e.preventDefault();
    this.keys.delete('Space');
    this.consumed.delete('Space');
  };

  attach(): void {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('touchstart', this.touchstartHandler, { passive: false });
    window.addEventListener('touchend', this.touchendHandler, { passive: false });
    window.addEventListener('touchcancel', this.touchendHandler, { passive: false });
  }

  detach(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('touchstart', this.touchstartHandler);
    window.removeEventListener('touchend', this.touchendHandler);
    window.removeEventListener('touchcancel', this.touchendHandler);
    this.keys.clear();
    this.justPressed.clear();
    this.consumed.clear();
  }

  getSnapshot(): InputSnapshot {
    const snapshot: InputSnapshot = {
      spacePressed: this.isJustPressed('Space'),
      spaceHeld: this.keys.has('Space'),
    };
    this.justPressed.clear();
    return snapshot;
  }

  private isJustPressed(code: string): boolean {
    if (this.justPressed.has(code) && !this.consumed.has(code)) {
      this.consumed.add(code);
      return true;
    }
    return false;
  }
}
