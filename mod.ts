type ResolveFunction<T> = (value: T | PromiseLike<T>) => void;

export type Subscription<T> = (
  value: T | undefined,
  prevValue: T | undefined,
) => void;

export enum ResolvePriority {
  Takes = "takes",
  Loads = "loads",
}

export class PendingInsertionError extends Error {
  constructor() {
    super("cell is currently waiting for pending insertions");
  }
}

/**
 * A cell that holds a value and can alert users when a value in inserted.
 */
export default class AsyncCell<T> {
  readonly #priority: ResolvePriority;
  #inner?: T;
  #pendingInsertion = false;
  #subscriptions: Subscription<T>[] = [];
  #resolvers: Record<ResolvePriority, ResolveFunction<T>[]> = {
    takes: [],
    loads: [],
  };

  constructor(value?: T, priority: ResolvePriority = ResolvePriority.Takes) {
    this.#inner = value;
    this.#priority = priority;
  }

  /**
   * Returns the value from the cell or waits for a value to be inserted.
   * @returns the value in the cell.
   */
  load(): Promise<T> {
    if (this.#inner !== undefined) {
      return Promise.resolve(this.#inner);
    }

    return new Promise((resolve) => {
      this.#resolvers.loads.push(resolve);
    });
  }

  /**
   * Waits for a value to be placed in the cell and then resets it's inner value.
   * @returns the value placed into the cell.
   */
  async take(): Promise<T> {
    if (this.#inner !== undefined) {
      const oldValue = this.#inner;
      this.#inner = undefined;
      return oldValue;
    }

    return await new Promise((resolve) => {
      this.#resolvers.takes.push(resolve);
    });
  }

  /**
   * Peeks into the cell to check the current inner value.
   * @returns the current inner value of the cell.
   */
  peek(): T | undefined {
    return this.#inner;
  }

  /**
   * Inserts a value into the cell and resolves all promises waiting on the cell to be filled.
   * @param value the value to insert into the cell.
   */
  insert(value?: T) {
    if (this.#pendingInsertion) {
      throw new PendingInsertionError();
    }

    const prevValue = this.#inner;

    if (value === undefined) {
      this.#inner = undefined;
      this.#subscriptions.forEach((subscription) =>
        subscription(undefined, prevValue)
      );
    } else {
      this.#inner = value;
      this.#subscriptions.forEach((subscription) =>
        subscription(value, prevValue)
      );
    }

    if (this.#inner === undefined) return;

    // If we prioritize loads we'll resolve them before we resolve takes.
    if (this.#priority === ResolvePriority.Loads) {
      this.#resolvers.loads.forEach((resolver) => resolver(this.#inner!));
      this.#resolvers.loads = [];
    }

    const takeResolveFunction = this.#resolvers.takes.shift();
    if (takeResolveFunction !== undefined) {
      takeResolveFunction(this.#inner);
    } else if (this.#priority === ResolvePriority.Takes) {
      // Otherwise if we prioritize takes we'll resolve them after we do any takes, but not if there were tany takes.
      this.#resolvers.loads.forEach((resolver) => resolver(this.#inner!));
      this.#resolvers.loads = [];
    }
  }

  /**
   * Runs the provided function if no value is currently in the cell. If the result of the function
   * is a promise, the cell will block any insertions until it has resolved.
   * @param func a function returning a value to insert in the cell.
   */
  orInsert(func: () => T | Promise<T>) {
    if (this.#inner !== undefined) return;

    const output = func();

    if (output instanceof Promise) {
      this.#pendingInsertion = true;

      output.then((value) => {
        this.#pendingInsertion = false;
        this.insert(value);
      });
    } else {
      this.insert(output);
    }
  }

  /**
   * Registers a {@link Subscription} that is called when a new value is inserted into the cell.
   * @param subscriptions subscriptions to be invoked when a new value is inserted into the cell.
   */
  subscribe(...subscriptions: Subscription<T>[]): void {
    this.#subscriptions = [...this.#subscriptions, ...subscriptions];
  }
}
