interface CartLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

interface CheckoutPageProps {
  cartId: string;
  lines: CartLine[];
}

export function CheckoutPage(props: CheckoutPageProps) {
  const totalCents = props.lines.reduce(
    (total, line) => total + line.quantity * line.unitPriceCents,
    0,
  );

  return (
    <main>
      <h1>Checkout</h1>
      <p>{props.lines.length} items ready for purchase.</p>
      <strong>${(totalCents / 100).toFixed(2)}</strong>
      <button data-cart-id={props.cartId}>Place order</button>
    </main>
  );
}

