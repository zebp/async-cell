type ResolveFunction<T> = (value: T | PromiseLike<T>) => void;

/**
 * A cell that holds a value and can alert users when a value in inserted.
 */
export default class AsyncCell<T> {
  private inner?: T;
  private resolvers: ResolveFunction<T>[] = [];

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
   * Inserts a value into the cell and resolves all promises waiting on the cell to be filled.
   * @param value the value to insert into the cell.
   */
  public insert(value?: T) {
    if (!value) {
      this.inner = undefined;
    } else {
      this.inner = value;

      // Resolve all promises waiting for a value in the cell and then clear the array.
      this.resolvers.forEach((resolve) => resolve(value));
      this.resolvers = [];
    }
  }
}
