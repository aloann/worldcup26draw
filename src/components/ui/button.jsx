export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`btn ${className}`}
    >
      {children}
    </button>
  );
}
