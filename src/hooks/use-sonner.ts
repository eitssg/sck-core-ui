import { useMemo } from "react";
import type { ReactNode } from "react";
import { toast as sonnerToast } from "@/components/ui/sonner";

// Public id and options types kept minimal and stable across Sonner versions
export type ToastId = string | number;

export type ToastOptions = {
  description?: ReactNode;
  action?: ReactNode;
  id?: ToastId;
  duration?: number;
  dismissible?: boolean;
};

// Base toast function
function baseToast(message: ReactNode, options?: ToastOptions): ToastId {
  return sonnerToast(message, options);
}

// Helpers with explicit return types and no `any`
function success(message: ReactNode, options?: ToastOptions): ToastId {
  return sonnerToast.success(message, options);
}

function error(message: ReactNode, options?: ToastOptions): ToastId {
  return sonnerToast.error(message, options);
}

function warning(message: ReactNode, options?: ToastOptions): ToastId {
  // Some versions expose `warning`; if missing, fall back to base toast
  const maybe = (sonnerToast as unknown as { warning?: (m: ReactNode, o?: ToastOptions) => ToastId }).warning;
  return (maybe?.(message, options) as ToastId | undefined) ?? baseToast(message, options);
}

function info(message: ReactNode, options?: ToastOptions): ToastId {
  // Some versions expose `info`; if missing, fall back to base toast
  const maybe = (sonnerToast as unknown as { info?: (m: ReactNode, o?: ToastOptions) => ToastId }).info;
  return (maybe?.(message, options) as ToastId | undefined) ?? baseToast(message, options);
}

function dismiss(id?: ToastId): void {
  sonnerToast.dismiss(id);
}

// Promise helper typed without `any` and with stable handler shapes
export type PromiseMessages<T = unknown> = {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
};

function promise<T>(
  p: Promise<T>,
  messages: PromiseMessages<T>,
  options?: ToastOptions
): ToastId {
  return (sonnerToast as unknown as {
    promise: (
      pr: Promise<T>,
      h: PromiseMessages<T> & ToastOptions
    ) => ToastId;
  }).promise(p, { ...messages, ...options });
}

// Export a single `toast` object (function + helpers), matching Sonner ergonomics
export const toast = Object.assign(baseToast, {
  success,
  error,
  warning,
  info,
  dismiss,
  promise,
});

// Hook that exposes the toast api. Kept minimal and side-effect free.
export function useToast() {
  return useMemo(() => ({ toast, dismiss }), []);
}
