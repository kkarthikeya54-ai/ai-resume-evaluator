export default function SuccessAnimation({ label = "Upload Complete" }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="success-check">
        <svg className="h-16 w-16" viewBox="0 0 52 52">
          <circle className="success-circle" cx="26" cy="26" r="24" fill="none" />
          <path className="success-checkmark" fill="none" d="M14 27l8 8 16-16" />
        </svg>
      </div>
      <p className="mt-6 text-lg font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-secondary">Your resume is ready for analysis.</p>
    </div>
  );
}
