export interface InventoryReservationLine {
  sku: string;
  quantity: number;
}

export const inventoryService = {
  async reserve(lines: InventoryReservationLine[]) {
    for (const line of lines) {
      if (line.quantity <= 0) {
        throw new Error(`Cannot reserve ${line.quantity} units for ${line.sku}.`);
      }
    }

    return {
      reservationId: `res_${lines.map((line) => line.sku).join("_")}`,
    };
  },
};

