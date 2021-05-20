type ResolveFunction<T> = (value: T | PromiseLike<T>) => void;

export type Subscription<T> = (
  value: T | undefined,
  prevValue: T | undefined
) => void;

export enum ResolvePriority {
  Takes = "takes",
  Loads = "loads",
}

/**
 * A cell that holds a value and can alert users when a value in inserted.
 */
export default class AsyncCell<T> {
  private readonly priority: ResolvePriority;
  private inner?: T;
  private subscriptions: Subscription<T>[] = [];
  private resolvers: Record<ResolvePriority, ResolveFunction<T>[]> = {
    takes: [],
    loads: [],
  };

  public constructor(
    value?: T,
    priority: ResolvePriority = ResolvePriority.Takes
  ) {
    this.inner = value;
    this.priority = priority;
  }

  /**
   * Returns the value from the cell or waits for a value to be inserted.
   * @returns the value in the cell.
   */
  public load(): Promise<T> {
    if (this.inner !== undefined) {
      return Promise.resolve(this.inner);
    }

    return new Promise((resolve) => {
      this.resolvers.loads.push(resolve);
    });
  }

  /**
   * Waits for a value to be placed in the cell and then resets it's inner value.
   * @returns the value placed into the cell.
   */
  public async take(): Promise<T> {
    if (this.inner !== undefined) {
      const oldValue = this.inner;
      this.inner = undefined;
      return oldValue;
    }

    return await new Promise((resolve) => {
      this.resolvers.takes.push(resolve);
    });
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

    if (value === undefined) {
      this.inner = undefined;
      this.subscriptions.forEach((subscription) =>
        subscription(undefined, prevValue)
      );
    } else {
      this.inner = value;
      this.subscriptions.forEach((subscription) =>
        subscription(value, prevValue)
      );
    }

    if (this.inner === undefined) return;

    // If we prioritize loads we'll resolve them before we resolve takes.
    if (this.priority === ResolvePriority.Loads) {
      this.resolvers.loads.forEach((resolver) => resolver(this.inner!));
      this.resolvers.loads = [];
    }

    const takeResolveFunction = this.resolvers.takes.shift();
    if (takeResolveFunction !== undefined) {
      takeResolveFunction(this.inner);
    } else if (this.priority === ResolvePriority.Takes) {
      // Otherwise if we prioritize takes we'll resolve them after we do any takes, but not if there were tany takes.
      this.resolvers.loads.forEach((resolver) => resolver(this.inner!));
      this.resolvers.loads = [];
    }
  }

  /**
   * Registers a {@link Subscription} that is called when a new value is inserted into the cell.
   * @param subscriptions subscriptions to be invoked when a new value is inserted into the cell.
   */
  public subscribe(...subscriptions: Subscription<T>[]): void {
    this.subscriptions = [...this.subscriptions, ...subscriptions];
  }
}
