export interface OrderPlacedEvent {
  type: "order_placed";
  orderId: string;
  customerId: string;
  lineCount: number;
}

const subscribers = new Set<(event: OrderPlacedEvent) => Promise<void>>();

export const orderEvents = {
  subscribe(handler: (event: OrderPlacedEvent) => Promise<void>) {
    subscribers.add(handler);
  },

  async publish(event: OrderPlacedEvent) {
    for (const subscriber of subscribers) {
      await subscriber(event);
    }
  },
};

