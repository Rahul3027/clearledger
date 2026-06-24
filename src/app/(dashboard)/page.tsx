export default function DashboardPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to your Dashboard</h2>
      <p className="text-gray-600">
        This is a protected route. Only authenticated users can see this.
      </p>
    </div>
  );
}
