import { ordersRepository } from "../data/orders-repository";
import { orderEvents } from "../events/order-events";
import { inventoryService } from "./inventory-service";
import { paymentProvider } from "./payment-provider";

export interface CheckoutCommand {
  cartId: string;
  customerId: string;
  paymentToken: string;
  shippingAddressId: string;
}

export const checkoutService = {
  async checkout(command: CheckoutCommand) {
    const cartLines = [
      { sku: "sku_lamp", quantity: 1, unitPriceCents: 6400 },
      { sku: "sku_cable", quantity: 2, unitPriceCents: 1299 },
    ];

    await inventoryService.reserve(cartLines);

    const payment = await paymentProvider.authorize({
      customerId: command.customerId,
      paymentToken: command.paymentToken,
      amountCents: cartLines.reduce(
        (total, line) => total + line.quantity * line.unitPriceCents,
        0,
      ),
    });

    const order = await ordersRepository.save({
      id: `ord_${command.cartId}`,
      cartId: command.cartId,
      customerId: command.customerId,
      paymentAuthorizationId: payment.authorizationId,
      status: "placed",
      lines: cartLines,
    });

    await orderEvents.publish({
      type: "order_placed",
      orderId: order.id,
      customerId: order.customerId,
      lineCount: order.lines.length,
    });

    return {
      orderId: order.id,
      status: order.status,
    };
  },
};

