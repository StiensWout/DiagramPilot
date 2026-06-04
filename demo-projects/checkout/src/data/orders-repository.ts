export interface OrderLineRecord {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderRecord {
  id: string;
  cartId: string;
  customerId: string;
  paymentAuthorizationId: string;
  status: "placed" | "ready_for_fulfillment";
  lines: OrderLineRecord[];
}

const orders = new Map<string, OrderRecord>();

export const ordersRepository = {
  async save(order: OrderRecord) {
    orders.set(order.id, order);
    return order;
  },

  async markReadyForFulfillment(orderId: string) {
    const order = orders.get(orderId);

    if (order === undefined) {
      throw new Error(`Order ${orderId} was not found.`);
    }

    const updated = {
      ...order,
      status: "ready_for_fulfillment" as const,
    };

    orders.set(orderId, updated);
    return updated;
  },
};

