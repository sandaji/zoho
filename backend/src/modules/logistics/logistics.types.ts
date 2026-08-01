// NOTE: This file will have compilation errors until the Prisma client is regenerated.
// Please run `npx prisma generate` in the `backend` directory.

import { Delivery, DispatchNote, Truck, User } from '@prisma/client';

export type DeliveryWithDetails = Delivery & {
  driver: User;
  truck: Truck;
  dispatchNotes: (DispatchNote & {
    salesOrder: {
      soNumber: string;
      customer: {
        name: string;
      };
    };
  })[];
};
