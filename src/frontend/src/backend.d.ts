import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MenuItem {
    id: bigint;
    name: string;
    available: boolean;
    category: string;
    printerNumber: bigint;
    price: bigint;
}
export type Timestamp = bigint;
export interface VehicleInfo {
    model: string;
    licensePlate: string;
    make: string;
    color: string;
}
export interface Notification {
    id: bigint;
    orderId: bigint;
    acknowledged: boolean;
    message: string;
    timestamp: Timestamp;
}
export interface OrderInput {
    id: bigint;
    status: OrderStatus;
    vehicleInfo: VehicleInfo;
    discountType: string;
    customerMobile: string;
    timestamp: Timestamp;
    discount: bigint;
    items: Array<OrderItem>;
}
export interface OrderItem {
    name: string;
    quantity: bigint;
    price: bigint;
}
export interface Order {
    id: bigint;
    status: OrderStatus;
    vehicleInfo: VehicleInfo;
    cancellationReason: string;
    discountType: string;
    customerMobile: string;
    timestamp: Timestamp;
    discount: bigint;
    items: Array<OrderItem>;
}
export enum OrderStatus {
    preparing = "preparing",
    cancelled = "cancelled",
    pending = "pending",
    fulfilled = "fulfilled",
    ready = "ready"
}
export interface backendInterface {
    acknowledgeAllNotifications(): Promise<void>;
    acknowledgeNotification(notificationId: bigint): Promise<void>;
    addItemsToOrder(orderId: bigint, newItems: Array<OrderItem>, packingCharge: bigint, deliveryCharge: bigint): Promise<void>;
    addMenuItem(name: string, category: string, price: bigint, printerNumber: bigint): Promise<bigint>;
    cancelOrder(orderId: bigint, reason: string): Promise<void>;
    clearAllData(): Promise<void>;
    clearAllNotifications(): Promise<void>;
    clearAllOrders(): Promise<void>;
    deleteMenuItem(id: bigint): Promise<void>;
    getAllOrders(): Promise<Array<Order>>;
    getMenuItems(): Promise<Array<MenuItem>>;
    getNotifications(): Promise<Array<Notification>>;
    getOrderById(id: bigint): Promise<Order>;
    getPendingOrders(): Promise<Array<Order>>;
    getUnacknowledgedCount(): Promise<bigint>;
    getUnacknowledgedNotifications(): Promise<Array<Notification>>;
    initMenu(): Promise<void>;
    placeOrder(order: OrderInput): Promise<bigint>;
    resetMenuToDefaults(): Promise<void>;
    updateMenuItem(id: bigint, name: string, category: string, price: bigint, printerNumber: bigint, available: boolean): Promise<void>;
    updateOrderDiscount(orderId: bigint, discount: bigint, discountType: string): Promise<void>;
    updateOrderItems(orderId: bigint, items: Array<OrderItem>, packingCharge: bigint, deliveryCharge: bigint): Promise<void>;
    updateOrderStatus(orderId: bigint, status: OrderStatus): Promise<void>;
}
