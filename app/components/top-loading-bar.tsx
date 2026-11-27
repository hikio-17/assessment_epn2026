import { useEffect, useRef } from "react";
import LoadingBar, {
  type LoadingBarRef,
} from "react-top-loading-bar";

import {
  subscribePageLoading,
  useRouteLoading,
} from "~/lib/page-loading";

export function TopLoadingBar() {
  const ref = useRef<LoadingBarRef>(null);

  useRouteLoading();

  useEffect(() => {
    let completeTimer: number | undefined;

    const unsubscribe = subscribePageLoading((active) => {
      if (active) {
        if (completeTimer !== undefined) {
          window.clearTimeout(completeTimer);
          completeTimer = undefined;
        }

        ref.current?.continuousStart();
        return;
      }

      if (completeTimer !== undefined) {
        return;
      }

      completeTimer = window.setTimeout(() => {
        ref.current?.complete();
        completeTimer = undefined;
      }, 400);
    });

    return () => {
      unsubscribe();

      if (completeTimer !== undefined) {
        window.clearTimeout(completeTimer);
      }
    };
  }, []);

  return (
    <LoadingBar
      ref={ref}
      color="#4f46e5"
      height={3}
      shadow={false}
      waitingTime={200}
      transitionTime={250}
      loaderSpeed={400}
      containerClassName="top-loading-bar pointer-events-none"
      containerStyle={{
        position: "absolute",
        top: "auto",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 40,
      }}
      style={{
        background:
          "linear-gradient(90deg, #4f46e5, #818cf8)",
      }}
    />
  );
}
