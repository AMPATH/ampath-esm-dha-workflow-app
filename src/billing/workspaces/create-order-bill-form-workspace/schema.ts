import { z } from 'zod';

export const createValidationSchema = (isDrug: boolean) => z.object({
    unitPrice: z.string({ required_error: "Unit price is required" }),
    quantity: z.number({ required_error: "Quantity is required" }),
    cashPoint: z.string({ required_error: "Cashpoint is required" }),
    billableItem: z.string().optional(),
    batchNumber: isDrug
        ? z.string({ required_error: "Batch number is required" }).min(1, "Batch number is required")
        : z.string().optional(),
});

const validationSchema = createValidationSchema(false);

export { validationSchema };

export type CreateOrderBillFormSchema = z.infer<typeof validationSchema>;