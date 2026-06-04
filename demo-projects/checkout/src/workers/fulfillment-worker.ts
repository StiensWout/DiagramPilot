import { ordersRepository } from "../data/orders-repository";
import { orderEvents } from "../events/order-events";

export function startFulfillmentWorker() {
  orderEvents.subscribe(async (event) => {
    await ordersRepository.markReadyForFulfillment(event.orderId);
  });
}

