import { checkoutService } from "../services/checkout-service";

export interface CheckoutRequestBody {
  cartId: string;
  customerId: string;
  paymentToken: string;
  shippingAddressId: string;
}

export async function postCheckout(request: { body: CheckoutRequestBody }) {
  const result = await checkoutService.checkout({
    cartId: request.body.cartId,
    customerId: request.body.customerId,
    paymentToken: request.body.paymentToken,
    shippingAddressId: request.body.shippingAddressId,
  });

  return {
    status: 201,
    body: {
      orderId: result.orderId,
      status: result.status,
    },
  };
}

export const checkoutRoutes = [
  {
    method: "POST",
    path: "/checkout",
    handler: postCheckout,
  },
];

