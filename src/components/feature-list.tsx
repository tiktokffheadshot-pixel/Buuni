const features = [
  ["👥", "Play with 4 people"],
  ["💬", "Talk during the game"],
  ["🔎", "Find the thief"],
  ["🏆", "Earn rewards"],
] as const;

export function FeatureList() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="features-title"
      className="border-y border-[var(--line)] py-8 sm:py-10"
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        {features.map(([icon, label]) => (
          <div key={label} className="bg-[var(--background)] p-4 sm:p-5">
            <div className="mb-5 text-xl" aria-hidden="true">
              {icon}
            </div>
            <p className="text-sm font-bold leading-5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
