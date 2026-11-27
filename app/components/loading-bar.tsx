type LoadingBarProps = {
  active: boolean;
};

export function LoadingBar({
  active,
}: LoadingBarProps) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-slate-200 transition-opacity ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full bg-indigo-500 transition-all duration-500 ${
          active
            ? "w-2/3 animate-pulse"
            : "w-0"
        }`}
      />
    </div>
  );
}
