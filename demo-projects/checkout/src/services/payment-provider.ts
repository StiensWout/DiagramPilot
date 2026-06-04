export interface PaymentAuthorizationRequest {
  customerId: string;
  paymentToken: string;
  amountCents: number;
}

export const paymentProvider = {
  async authorize(request: PaymentAuthorizationRequest) {
    if (request.amountCents <= 0) {
      throw new Error("Payment authorization requires a positive amount.");
    }

    return {
      authorizationId: `pay_${request.customerId}_${request.paymentToken}`,
      authorizedAmountCents: request.amountCents,
    };
  },
};

