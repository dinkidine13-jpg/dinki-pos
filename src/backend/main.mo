import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";

import List "mo:core/List";


actor {
  public type Timestamp = Time.Time;

  public type VehicleInfo = {
    make : Text;
    model : Text;
    color : Text;
    licensePlate : Text;
  };

  public type OrderStatus = {
    #pending;
    #preparing;
    #ready;
    #fulfilled;
    #cancelled;
  };

  public type OrderInput = {
    id : Nat;
    vehicleInfo : VehicleInfo;
    customerMobile : Text;
    items : [OrderItem];
    timestamp : Timestamp;
    status : OrderStatus;
    discount : Nat;
    discountType : Text; // "flat" or "percent"
  };

  public type Order = {
    id : Nat;
    vehicleInfo : VehicleInfo;
    customerMobile : Text;
    items : [OrderItem];
    timestamp : Timestamp;
    status : OrderStatus;
    discount : Nat;
    discountType : Text; // "flat" or "percent"
    cancellationReason : Text;
  };

  public type OrderItem = {
    name : Text;
    quantity : Nat;
    price : Nat;
  };

  public type Notification = {
    id : Nat;
    orderId : Nat;
    message : Text;
    acknowledged : Bool;
    timestamp : Timestamp;
  };

  public type NotificationInput = {
    orderId : Nat;
    message : Text;
  };

  public type MenuItem = {
    id : Nat;
    name : Text;
    category : Text;
    price : Nat;
    printerNumber : Nat;
    available : Bool;
  };

  module Notification {
    public func compare(n1 : Notification, n2 : Notification) : Order.Order {
      Nat.compare(n1.id, n2.id);
    };

    public func compareByTimestamp(n1 : Notification, n2 : Notification) : Order.Order {
      Int.compare(n1.timestamp, n2.timestamp);
    };
  };

  type InvoiceRecord = {
    orderId : Nat;
    invoiceNumber : Nat;
    timestamp : Time.Time;
    items : [OrderItem];
    packingCharge : Nat;
    deliveryCharge : Nat;
    totalAmount : Nat;
    paymentMode : Text;
    discount : Nat;
    discountType : Text;
  };

  public type InvoiceInput = {
    orderId : Nat;
    items : [OrderItem];
    packingCharge : Nat;
    deliveryCharge : Nat;
    totalAmount : Nat;
    paymentMode : Text;
    discount : Nat;
    discountType : Text;
  };

  var nextOrderId = 1;
  var nextNotificationId = 1;
  var nextMenuItemId = 1;
  var menuSeeded = false;

  let orders = Map.empty<Nat, Order>();
  let notifications = Map.empty<Nat, Notification>();
  let menuItems = Map.empty<Nat, MenuItem>();

  // Default menu items matching the 14 live categories
  let DEFAULT_MENU : [(Text, Text, Nat, Nat)] = [
    // Hot n Hot - printer 1
    ("Veg Puff", "Hot n Hot", 30, 1),
    ("Samosa", "Hot n Hot", 20, 1),
    ("Aloo Tikki", "Hot n Hot", 40, 1),
    // Dosa - printer 1
    ("Masala Dosa", "Dosa", 120, 1),
    ("Plain Dosa", "Dosa", 90, 1),
    ("Rava Dosa", "Dosa", 110, 1),
    ("Set Dosa", "Dosa", 100, 1),
    // Breakfast - printer 1
    ("Idli Sambar", "Breakfast", 90, 1),
    ("Medu Vada", "Breakfast", 80, 1),
    ("Upma", "Breakfast", 70, 1),
    ("Poha", "Breakfast", 60, 1),
    ("Filter Coffee", "Breakfast", 50, 1),
    // Chaat - printer 1
    ("Pani Puri", "Chaat", 60, 1),
    ("Bhel Puri", "Chaat", 70, 1),
    ("Sev Puri", "Chaat", 70, 1),
    // Ice cream novelties - printer 1
    ("Choco Bar", "Ice cream novelties", 30, 1),
    ("Kulfi", "Ice cream novelties", 40, 1),
    // Ice cream cups n packs - printer 1
    ("Vanilla Cup", "Ice cream cups n packs", 50, 1),
    ("Chocolate Cup", "Ice cream cups n packs", 60, 1),
    // Juice n Shakes - printer 1
    ("Mango Juice", "Juice n Shakes", 80, 1),
    ("Mixed Fruit Shake", "Juice n Shakes", 100, 1),
    ("Mango Lassi", "Juice n Shakes", 90, 1),
    // Soup - printer 2
    ("Tomato Soup", "Soup", 80, 2),
    ("Sweet Corn Soup", "Soup", 90, 2),
    ("Veg Soup", "Soup", 85, 2),
    // Starter - printer 2
    ("Paneer Tikka", "Starter", 250, 2),
    ("Spring Rolls", "Starter", 130, 2),
    ("Manchurian", "Starter", 160, 2),
    ("Chilli Paneer", "Starter", 180, 2),
    // Roti (Bread) - printer 4
    ("Butter Roti", "Roti (Bread)", 30, 4),
    ("Butter Naan", "Roti (Bread)", 60, 4),
    ("Tandoori Roti", "Roti (Bread)", 40, 4),
    ("Laccha Paratha", "Roti (Bread)", 70, 4),
    // Main course - printer 2
    ("Dal Makhani", "Main course", 180, 2),
    ("Shahi Paneer", "Main course", 220, 2),
    ("Matar Paneer", "Main course", 200, 2),
    ("Chole", "Main course", 160, 2),
    // Rice n Noodles - printer 3
    ("Veg Biryani", "Rice n Noodles", 200, 3),
    ("Veg Fried Rice", "Rice n Noodles", 150, 3),
    ("Hakka Noodles", "Rice n Noodles", 140, 3),
    ("Schezwan Rice", "Rice n Noodles", 160, 3),
    // Softdrinks - printer 1
    ("Coca Cola", "Softdrinks", 40, 1),
    ("Sprite", "Softdrinks", 40, 1),
    ("Limca", "Softdrinks", 40, 1),
    // Grill n spice - printer 3
    ("Grilled Sandwich", "Grill n spice", 120, 3),
    ("Corn Cheese Grill", "Grill n spice", 140, 3),
  ];

  // Seed default menu items
  func seedMenu() {
    if (menuSeeded) return;
    menuSeeded := true;

    for ((name, category, price, printer) in DEFAULT_MENU.vals()) {
      let id = nextMenuItemId;
      nextMenuItemId += 1;
      menuItems.add(id, {
        id;
        name;
        category;
        price;
        printerNumber = printer;
        available = true;
      });
    };
  };

  // Ensure menu is seeded on every call
  func ensureSeeded() {
    if (not menuSeeded) { seedMenu() };
  };

  // ── Menu APIs ──────────────────────────────────────────────────

  public query func getMenuItems() : async [MenuItem] {
    if (not menuSeeded) {
      // Return default items inline for query (can't mutate in query)
      return Array.tabulate<MenuItem>(DEFAULT_MENU.size(), func(i) {
        let (name, category, price, printer) = DEFAULT_MENU[i];
        { id = i + 1; name; category; price; printerNumber = printer; available = true };
      });
    };
    menuItems.values().toArray();
  };

  public shared func initMenu() : async () {
    seedMenu();
  };

  public shared ({ caller }) func addMenuItem(name : Text, category : Text, price : Nat, printerNumber : Nat) : async Nat {
    ensureSeeded();
    let id = nextMenuItemId;
    nextMenuItemId += 1;
    menuItems.add(id, { id; name; category; price; printerNumber; available = true });
    id;
  };

  public shared ({ caller }) func updateMenuItem(id : Nat, name : Text, category : Text, price : Nat, printerNumber : Nat, available : Bool) : async () {
    ensureSeeded();
    switch (menuItems.get(id)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (?item) {
        menuItems.add(id, { item with name; category; price; printerNumber; available });
      };
    };
  };

  public shared ({ caller }) func deleteMenuItem(id : Nat) : async () {
    ensureSeeded();
    menuItems.remove(id);
  };

  public shared ({ caller }) func resetMenuToDefaults() : async () {
    menuItems.clear();
    nextMenuItemId := 1;
    menuSeeded := false;
    seedMenu();
  };

  // ── Orders ──────────────────────────────────────────────────────

  public shared ({ caller }) func placeOrder(order : OrderInput) : async Nat {
    let orderId = nextOrderId;
    nextOrderId += 1;

    let newOrder : Order = {
      id = orderId;
      vehicleInfo = order.vehicleInfo;
      customerMobile = order.customerMobile;
      items = order.items;
      timestamp = order.timestamp;
      status = #pending;
      discount = order.discount;
      discountType = order.discountType;
      cancellationReason = "";
    };

    orders.add(orderId, newOrder);
    createNotification({
      orderId;
      message = "New order placed";
    });

    orderId;
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, status : OrderStatus) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = { order with status };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func cancelOrder(orderId : Nat, reason : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          order with
          status = #cancelled;
          cancellationReason = reason;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  func addOrUpdateItems(orderId : Nat, newItems : [OrderItem], packingCharge : Nat, deliveryCharge : Nat, isFullUpdate : Bool) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedItems = newItems.map(
          func(item) {
            if (item.name == "Packing Charges") {
              { item with price = packingCharge };
            } else if (item.name == "Delivery Charge") {
              { item with price = deliveryCharge };
            } else {
              item;
            };
          }
        );

        let resultingItems = if (isFullUpdate) {
          updatedItems;
        } else {
          order.items.concat(updatedItems);
        };

        let updatedOrder = { order with items = resultingItems };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func addItemsToOrder(orderId : Nat, newItems : [OrderItem], packingCharge : Nat, deliveryCharge : Nat) : async () {
    await addOrUpdateItems(orderId, newItems, packingCharge, deliveryCharge, false);
  };

  public shared ({ caller }) func updateOrderItems(orderId : Nat, items : [OrderItem], packingCharge : Nat, deliveryCharge : Nat) : async () {
    await addOrUpdateItems(orderId, items, packingCharge, deliveryCharge, true);
  };

  public shared ({ caller }) func updateOrderDiscount(orderId : Nat, discount : Nat, discountType : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          order with
          discount;
          discountType;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getAllOrders() : async [Order] {
    orders.values().toArray();
  };

  public query ({ caller }) func getOrderById(id : Nat) : async Order {
    switch (orders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { order };
    };
  };

  public query ({ caller }) func getPendingOrders() : async [Order] {
    orders.values().toArray().filter(func(o) { o.status == #pending });
  };

  // ── Notifications ──────────────────────────────────────────────

  func createNotification(input : NotificationInput) {
    let notificationId = nextNotificationId;
    nextNotificationId += 1;

    let newNotification : Notification = {
      id = notificationId;
      orderId = input.orderId;
      message = input.message;
      acknowledged = false;
      timestamp = Time.now();
    };

    notifications.add(notificationId, newNotification);
  };

  public shared ({ caller }) func acknowledgeNotification(notificationId : Nat) : async () {
    switch (notifications.get(notificationId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?notification) {
        let updatedNotification = { notification with acknowledged = true };
        notifications.add(notificationId, updatedNotification);
      };
    };
  };

  public shared ({ caller }) func acknowledgeAllNotifications() : async () {
    let allNotifications = notifications.toArray();
    notifications.clear();
    allNotifications.forEach(
      func((id, notification)) {
        notifications.add(id, { notification with acknowledged = true });
      }
    );
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    notifications.values().toArray().sort(Notification.compareByTimestamp);
  };

  public query ({ caller }) func getUnacknowledgedCount() : async Nat {
    var count = 0;
    notifications.keys().forEach(
      func(id) {
        switch (notifications.get(id)) {
          case (null) {};
          case (?notification) {
            if (not notification.acknowledged) {
              count += 1;
            };
          };
        };
      }
    );
    count;
  };

  public query ({ caller }) func getUnacknowledgedNotifications() : async [Notification] {
    notifications.values().toArray().filter(func(n) { not n.acknowledged });
  };

  // ── New Clear Functions ────────────────────────────────────────

  public shared func clearAllOrders() : async () {
    orders.clear();
    nextOrderId := 1;
  };

  public shared func clearAllNotifications() : async () {
    notifications.clear();
    nextNotificationId := 1;
  };

  public shared func clearAllData() : async () {
    await clearAllOrders();
    await clearAllNotifications();
    await resetMenuToDefaults();
  };
};
