/**
 * Minimal types for Razorpay's checkout.js, loaded on /checkout only.
 */

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayErrorResponse = {
  code: string;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string; name?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
    animation?: boolean;
  };
  handler?: (response: RazorpaySuccessResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, handler: (arg: never) => void) => void;
    };
  }
}
