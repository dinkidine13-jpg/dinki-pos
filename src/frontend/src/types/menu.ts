// Menu types - backend methods are available at runtime via the canister
// but may not be reflected in the generated backend.ts yet.
export interface MenuItem {
  id: bigint;
  name: string;
  category: string;
  price: bigint;
  printerNumber: bigint;
  available: boolean;
}

export interface MenuActor {
  getMenuItems(): Promise<Array<MenuItem>>;
  initMenu(): Promise<void>;
  addMenuItem(
    name: string,
    category: string,
    price: bigint,
    printerNumber: bigint,
  ): Promise<bigint>;
  updateMenuItem(
    id: bigint,
    name: string,
    category: string,
    price: bigint,
    printerNumber: bigint,
    available: boolean,
  ): Promise<void>;
  deleteMenuItem(id: bigint): Promise<void>;
  resetMenuToDefaults(): Promise<void>;
}
