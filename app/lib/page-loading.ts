import { useEffect } from "react";
import { useNavigation } from "react-router";

type Listener = (active: boolean) => void;

let activeCount = 0;
const listeners = new Set<Listener>();

function emit() {
  const active = activeCount > 0;

  for (const listener of listeners) {
    listener(active);
  }
}

export function beginPageLoading() {
  activeCount += 1;
  emit();
}

export function endPageLoading() {
  activeCount = Math.max(0, activeCount - 1);
  emit();
}

export function subscribePageLoading(
  listener: Listener,
) {
  listeners.add(listener);
  listener(activeCount > 0);

  return () => {
    listeners.delete(listener);
  };
}

export function useRouteLoading() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  useEffect(() => {
    if (!active) return;

    beginPageLoading();

    return () => {
      endPageLoading();
    };
  }, [active]);
}

export function usePageLoading(active: boolean) {
  useEffect(() => {
    if (!active) return;

    beginPageLoading();

    return () => {
      endPageLoading();
    };
  }, [active]);
}
