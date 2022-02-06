import AsyncCell, { PendingInsertionError } from "./mod.ts";
import {
  assert,
  assertEquals,
  assertThrows,
  fail,
} from "https://deno.land/std/testing/asserts.ts";

Deno.test({
  name: "single load",
  fn: async () => {
    const cell = new AsyncCell();

    // Wait 100ms then insert 10 into the cell.
    setTimeout(() => cell.insert(10), 100);

    const value = await cell.load();
    assertEquals(value, 10);
  },
});

Deno.test({
  name: "mutli load",
  fn: async () => {
    const cell = new AsyncCell();

    // Wait 100ms then insert 10 into the cell.
    setTimeout(() => cell.insert(10), 100);

    // Waits for both of the load promises.
    await Promise.all([
      cell.load().then((value) => assertEquals(value, 10)),
      cell.load().then((value) => assertEquals(value, 10)),
    ]);
  },
});

Deno.test({
  name: "take",
  fn: async () => {
    const cell = new AsyncCell(10);

    let value = undefined;
    cell.take().then((newValue) => (value = newValue));

    // Wait 10ms so for the cell to load.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Ensure that the value was taken from the cell.
    assertEquals(value, 10);

    const cellHadValue: boolean = await Promise.race([
      cell.take().then(() => true),
      // Wait 100ms to see if we get cellHadValue double take.
      await new Promise<boolean>((resolve) => setTimeout(resolve, 10, false)),
    ]);

    if (cellHadValue) fail("Cell yielded the same value twice with take()");
  },
});

Deno.test({
  name: "peek",
  fn: async () => {
    const cell = new AsyncCell(10);

    assertEquals(cell.peek(), 10);

    // Clear the cell.
    await cell.take();

    assertEquals(cell.peek(), undefined);
  },
});

Deno.test({
  name: "subscribe",
  fn: () => {
    const cell = new AsyncCell();
    let subscriptionCalled = false;
    cell.subscribe(() => (subscriptionCalled = true));
    cell.insert({});
    assert(subscriptionCalled);
  },
});

Deno.test({
  name: "no double take",
  fn: async () => {
    let takes = 0;
    const cell = new AsyncCell();

    cell.take().then(() => takes++);
    cell.take().then(() => takes++);

    cell.insert(0);

    // We need to wait a split second for the event loop to execute the take promises.
    await new Promise((resolve) => setTimeout(resolve, 2, false));

    // Assert we only resolve a single take promise.
    assertEquals(takes, 1);
  },
});

Deno.test({
  name: "or insert sync",
  fn: async () => {
    const cell = new AsyncCell<number>();
    cell.orInsert(() => 1);

    assertEquals(await cell.take(), 1);
  },
});

Deno.test({
  name: "or insert async instant",
  fn: async () => {
    const cell = new AsyncCell<number>();
    cell.orInsert(() => Promise.resolve(1));

    assertEquals(await cell.take(), 1);
  },
});

Deno.test({
  name: "or insert async",
  fn: async () => {
    const cell = new AsyncCell<number>();
    cell.orInsert(() => new Promise((resolve) => setTimeout(resolve, 100, 1)));

    // Ensure that a `PendingInsertionError` is thrown if we try to insert before the promise
    // resolves.
    assertThrows(
      () => cell.insert(100),
      (err: unknown) => assert(err instanceof PendingInsertionError),
    );

    assertEquals(await cell.take(), 1);

    // Call insert after we've waited for the orInsert promise to resolve, ensuring we don't throw
    // another PendingInsertionError
    cell.insert(100);
  },
});

Deno.test({
  name: "or insert full cell",
  fn: async () => {
    const cell = new AsyncCell<number>(1);
    cell.orInsert(() => 2);

    assertEquals(await cell.take(), 1);
  },
});
