type ResolveFunction<T> = (value: T | PromiseLike<T>) => void;

export type Subscription<T> = (
  value: T | undefined,
  prevValue: T | undefined,
) => void;

/**
 * A cell that holds a value and can alert users when a value in inserted.
 */
export default class AsyncCell<T> {
  private inner?: T;
  private resolvers: ResolveFunction<T>[] = [];
  private subscriptions: Subscription<T>[] = [];

  public constructor(value?: T) {
    this.inner = value;
  }

  /**
   * Returns the value from the cell or waits for a value to be inserted.
   * @returns the value in the cell.
   */
  public async load(): Promise<T> {
    return this.inner ??
      await new Promise((resolve) => this.resolvers.push(resolve));
  }

  /**
   * Waits for a value to be placed in the cell and then resets it's inner value.
   * @returns the value placed into the cell.
   */
  public async take(): Promise<T> {
    const value = await this.load();
    this.inner = undefined;
    return value;
  }

  /**
   * Peeks into the cell to check the current inner value.
   * @returns the current inner value of the cell.
   */
  public peek(): T | undefined {
    return this.inner;
  }

  /**
   * Inserts a value into the cell and resolves all promises waiting on the cell to be filled.
   * @param value the value to insert into the cell.
   */
  public insert(value?: T) {
    const prevValue = this.inner;

    if (!value) {
      this.inner = undefined;
      this.subscriptions.forEach((subscription) =>
        subscription(undefined, prevValue)
      );
    } else {
      this.inner = value;
      this.subscriptions.forEach((subscription) =>
        subscription(value, prevValue)
      );

      // Resolve all promises waiting for a value in the cell and then clear the array.
      this.resolvers.forEach((resolve) => resolve(value));
      this.resolvers = [];
    }
  }

  /**
   * Registers a {@link Subscription} that is called when a new value is inserted into the cell.
   * @param subscriptions subscriptions to be invoked when a new value is inserted into the cell.
   */
  public subscribe(
    ...subscriptions: Subscription<T>[]
  ): void {
    this.subscriptions = [...this.subscriptions, ...subscriptions];
  }
}
