export default function TrialExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow dark:bg-slate-900">
        <h1 className="mb-2 text-xl font-bold text-red-700 dark:text-red-400">Trial Period Expired</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Trial period has expired. Please contact the developer to continue using this system.
        </p>
      </div>
    </div>
  );
}
