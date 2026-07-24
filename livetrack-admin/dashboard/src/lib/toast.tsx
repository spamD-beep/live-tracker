import { useSyncExternalStore } from "react";

type ToastState = "loading" | "success" | "error";
type ToastItem = { id: number; state: ToastState; message: string };
type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
};

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => items;
const setToast = (id: number, state: ToastState, message: string) => {
  items = items.map(item => item.id === id ? { ...item, state, message } : item);
  emit();
};
const removeToast = (id: number) => {
  items = items.filter(item => item.id !== id);
  emit();
};

export const toast = {
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
    const id = nextId++;
    items = [...items, { id, state: "loading", message: messages.loading }];
    emit();
    return promise.then(value => {
      setToast(id, "success", typeof messages.success === "function" ? messages.success(value) : messages.success);
      window.setTimeout(() => removeToast(id), 3500);
      return value;
    }).catch(error => {
      setToast(id, "error", typeof messages.error === "function" ? messages.error(error) : messages.error);
      window.setTimeout(() => removeToast(id), 5500);
      throw error;
    });
  }
};

export function Toaster() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {current.map(item => (
        <div key={item.id} className={`toast toast-${item.state}`}>
          <span />
          <p>{item.message}</p>
        </div>
      ))}
    </div>
  );
}
