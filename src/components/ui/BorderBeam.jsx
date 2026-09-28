export default function BorderBeam({ className = "", duration = 4 }) {
  return (
    <div
      className={`border-beam ${className}`}
      style={{ animationDuration: `${duration}s` }}
    />
  );
}
