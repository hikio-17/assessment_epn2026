export type ToastVariant =
  | "success"
  | "error"
  | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
};

type ToastInput = Omit<ToastItem, "duration"> & {
  duration?: number;
};

const listeners = new Set<() => void>();
const timers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

let toasts: ToastItem[] = [];
const serverSnapshot: ToastItem[] = [];

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function clearTimer(id: string) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

export function pushToast(input: ToastInput) {
  if (toasts.some((toast) => toast.id === input.id)) {
    return;
  }

  const toast: ToastItem = {
    ...input,
    duration: input.duration ?? 4500,
  };

  const next = [toast, ...toasts];
  const overflow = next.slice(4);

  toasts = next.slice(0, 4);

  for (const item of overflow) {
    clearTimer(item.id);
  }

  timers.set(
    toast.id,
    setTimeout(() => {
      dismissToast(toast.id);
    }, toast.duration),
  );

  emit();
}

export function dismissToast(id: string) {
  if (!toasts.some((toast) => toast.id === id)) {
    return;
  }

  toasts = toasts.filter((toast) => toast.id !== id);
  clearTimer(id);
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}

export function getServerToasts() {
  return serverSnapshot;
}

export function resetToasts() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }

  timers.clear();
  toasts = [];
  emit();
}
