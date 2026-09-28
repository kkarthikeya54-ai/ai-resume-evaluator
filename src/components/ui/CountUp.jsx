import useCountUp from "../../hooks/useCountUp";

export default function CountUp({ value, duration = 1200, delay = 0, className = "" }) {
  const [ref, display] = useCountUp(value, { duration, delay });
  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
