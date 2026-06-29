export class UndoRedoStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  constructor(private maxSize: number) {}

  push(state: T): void {
    if (this.undoStack.length >= this.maxSize) this.undoStack.shift();
    this.undoStack.push(state);
    this.redoStack = [];
  }
  undo(currentState: T): T | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(currentState);
    return this.undoStack.pop()!;
  }
  redo(currentState: T): T | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(currentState);
    return this.redoStack.pop()!;
  }
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export type ItemOpType = "ADD" | "REMOVE" | "UPDATE_QUANTITY";

export interface ItemOperation {
  type: ItemOpType;
  itemId: number | null;
  listId: number | null;
  productId: number | null;
  quantity: number;
  unit: string;
  previousProductName: string;
}

export const ItemOp = {
  addItem(
    listId: number,
    productId: number,
    quantity: number,
    unit: string,
  ): ItemOperation {
    return {
      type: "ADD",
      itemId: null,
      listId,
      productId,
      quantity,
      unit,
      previousProductName: "",
    };
  },
  removeItem(
    itemId: number,
    listId: number,
    productId: number,
    productName: string,
  ): ItemOperation {
    return {
      type: "REMOVE",
      itemId,
      listId,
      productId,
      quantity: 0,
      unit: "",
      previousProductName: productName,
    };
  },
  updateQuantity(
    itemId: number,
    listId: number,
    oldQty: number,
    oldUnit: string,
  ): ItemOperation {
    return {
      type: "UPDATE_QUANTITY",
      itemId,
      listId,
      productId: null,
      quantity: oldQty,
      unit: oldUnit,
      previousProductName: "",
    };
  },
};
