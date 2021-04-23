import AsyncCell from "./mod.ts";
import {
  assert,
  assertEquals,
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
    cell.take().then((newValue) => value = newValue);

    // Wait 10ms so for the cell to load.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Ensure that the value was taken from the cell.
    assertEquals(value, 10);

    const cellHadValue: boolean = await Promise.race([
      cell.take().then(() => true),
      // Wait 100ms to see if we get cellHadValue double take.
      await new Promise((resolve) => setTimeout(resolve, 10, false)),
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
    cell.subscribe(() => subscriptionCalled = true);
    cell.insert({});
    assert(subscriptionCalled);
  },
});
