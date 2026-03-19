import { z } from 'zod';

const validationSchema = z.object({
    unitPrice: z.string({ required_error: "Unit price is required" }).min(1),
    quantity: z.number({ required_error: "Quantity is required" }),
    billableItem: z.string().optional()
});

export { validationSchema };

export type CreateOrderBillFormSchema = z.infer<typeof validationSchema>;