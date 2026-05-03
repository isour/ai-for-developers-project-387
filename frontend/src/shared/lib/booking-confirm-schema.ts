import { z } from "zod";

export const bookingConfirmFormSchema = z.object({
  guestDisplayName: z
    .string()
    .trim()
    .min(1, "Укажите имя"),
  guestContact: z
    .string()
    .trim()
    .min(1, "Укажите email")
    .email("Укажите корректный email"),
});

export type BookingConfirmFormValues = z.infer<typeof bookingConfirmFormSchema>;
