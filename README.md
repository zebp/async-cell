# async-cell

An async cell that holds a value and can alert users when a value in inserted.

## Examples

```typescript
const cell: AsyncCell<string> = new AsyncCell();

// Inserts the text hello world into the cell after a second.
setTimeout(() => cell.insert("Hello, world!"), 1000);

// Waits for the value to be inserted into the cell.
const value = await cell.load();
console.log(value);
```
