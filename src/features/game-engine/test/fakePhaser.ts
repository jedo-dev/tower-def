/**
 * Test-only stand-in for the `phaser` module. It renders nothing and keeps
 * just enough state (positions, visibility, registry, listeners, a manual
 * clock) for scene code to run headless under vitest in the node environment.
 *
 * Game objects answer any method they do not model with a chainable no-op, so
 * a new Graphics or Sprite call in runtime code does not break the harness.
 */

type Listener = (...args: unknown[]) => void;

type ListenerEntry = { listener: Listener; context: unknown; once: boolean };

export class FakeEventEmitter {
  private readonly listenersByEvent = new Map<string, ListenerEntry[]>();

  public on(event: string, listener: Listener, context?: unknown): this {
    return this.addListener(event, { listener, context, once: false });
  }

  public once(event: string, listener: Listener, context?: unknown): this {
    return this.addListener(event, { listener, context, once: true });
  }

  public off(event: string, listener?: Listener): this {
    const entries = this.listenersByEvent.get(event) ?? [];
    this.listenersByEvent.set(
      event,
      listener ? entries.filter((entry) => entry.listener !== listener) : [],
    );
    return this;
  }

  public emit(event: string, ...args: unknown[]): boolean {
    const entries = this.listenersByEvent.get(event) ?? [];
    this.listenersByEvent.set(
      event,
      entries.filter((entry) => !entry.once),
    );
    entries.forEach((entry) => entry.listener.apply(entry.context, args));
    return entries.length > 0;
  }

  public listenerCount(event: string): number {
    return this.listenersByEvent.get(event)?.length ?? 0;
  }

  private addListener(event: string, entry: ListenerEntry): this {
    this.listenersByEvent.set(event, [...(this.listenersByEvent.get(event) ?? []), entry]);
    return this;
  }
}

/** Answers unmodelled method calls with a no-op that returns the object itself. */
function withChainableFallback<T extends object>(target: T): T {
  const proxy: T = new Proxy(target, {
    get(object, property, receiver) {
      if (property in object) {
        return Reflect.get(object, property, receiver);
      }
      if (typeof property === 'symbol' || property === 'then' || property === 'toJSON') {
        return undefined;
      }
      return () => proxy;
    },
  });
  return proxy;
}

export type FakeGameObjectKind = 'graphics' | 'sprite' | 'image' | 'text' | 'bitmapText';

export class FakeGameObject extends FakeEventEmitter {
  public visible = true;
  public active = true;
  public isDestroyed = false;
  public alpha = 1;
  public depth = 0;
  public rotation = 0;
  public scaleX = 1;
  public scaleY = 1;
  public displayWidth = 0;
  public displayHeight = 0;
  public width = 0;
  public height = 0;
  public tint = 0xffffff;
  public text = '';
  /** Bitmap font key and size of a bitmapText object. */
  public font = '';
  public fontSize = 0;
  public currentAnimationKey: string | null = null;
  /** Rectangles a Graphics object filled since its last clear(), in call order. */
  public readonly fillRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  public readonly texture: { key: string };
  /** Sheet frame set through `setTexture(key, frame)`, if any. */
  public frameName: string | number | null = null;
  public name = '';
  private readonly dataByKey = new Map<string, unknown>();

  public constructor(
    public readonly kind: FakeGameObjectKind,
    public x: number,
    public y: number,
    textureKey = '',
  ) {
    super();
    this.texture = { key: textureKey };
  }

  public setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }

  public setPosition(x: number, y: number = x): this {
    this.x = x;
    this.y = y;
    return this;
  }

  public setX(x: number): this {
    this.x = x;
    return this;
  }

  public setY(y: number): this {
    this.y = y;
    return this;
  }

  public setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }

  public setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  public setRotation(rotation: number): this {
    this.rotation = rotation;
    return this;
  }

  public setScale(scaleX: number, scaleY: number = scaleX): this {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    return this;
  }

  public setDisplaySize(width: number, height: number): this {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }

  public setTint(tint: number): this {
    this.tint = tint;
    return this;
  }

  public setTexture(key: string, frame?: string | number): this {
    this.texture.key = key;
    this.frameName = frame ?? null;
    return this;
  }

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setText(text: string): this {
    this.text = text;
    return this;
  }

  public setFont(font: string): this {
    this.font = font;
    return this;
  }

  public setFontSize(fontSize: number): this {
    this.fontSize = fontSize;
    return this;
  }

  public setData(key: string, value: unknown): this {
    this.dataByKey.set(key, value);
    return this;
  }

  public getData(key: string): unknown {
    return this.dataByKey.get(key);
  }

  public fillRect(x: number, y: number, width: number, height: number): this {
    this.fillRects.push({ x, y, width, height });
    return this;
  }

  public clear(): this {
    this.fillRects.length = 0;
    return this;
  }

  public play(animationKey: string): this {
    this.currentAnimationKey = animationKey;
    return this;
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.active = false;
    this.visible = false;
  }
}

/** Every game object the scene created, in creation order. */
export class FakeObjectFactory {
  public readonly createdObjects: FakeGameObject[] = [];

  public graphics(): FakeGameObject {
    return this.create(new FakeGameObject('graphics', 0, 0));
  }

  public sprite(x: number, y: number, textureKey: string): FakeGameObject {
    return this.create(new FakeGameObject('sprite', x, y, textureKey));
  }

  public image(x: number, y: number, textureKey: string): FakeGameObject {
    return this.create(new FakeGameObject('image', x, y, textureKey));
  }

  public text(x: number, y: number, text: string): FakeGameObject {
    return this.create(new FakeGameObject('text', x, y).setText(text));
  }

  public bitmapText(x: number, y: number, font: string, text = '', size = 0): FakeGameObject {
    const gameObject = new FakeGameObject('bitmapText', x, y, font).setText(text);
    gameObject.font = font;
    gameObject.fontSize = size;
    return this.create(gameObject);
  }

  private create(gameObject: FakeGameObject): FakeGameObject {
    const chainable = withChainableFallback(gameObject);
    this.createdObjects.push(chainable);
    return chainable;
  }
}
