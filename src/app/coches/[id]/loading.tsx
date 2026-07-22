export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="skeleton h-48" />
      <div className="skeleton h-32" />
    </div>
  );
}
