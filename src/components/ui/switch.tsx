export function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onChange}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer relative ${
        checked ? "bg-[#007aff]" : "bg-[#d1d1d6]"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}
