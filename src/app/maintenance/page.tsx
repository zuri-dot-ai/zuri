// docs/11_ERROR_HANDLING.md §16.1
// Served when MAINTENANCE_MODE=true (see src/middleware.ts).

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <img
        src="/Zuri_Logo.png"
        alt="Zuri"
        width={100}
        height={30}
        className="mb-8"
      />
      <h1 className="font-heading text-3xl text-white mb-4">Back shortly</h1>
      <p className="text-white/50 max-w-sm">
        We&apos;re making improvements to Zuri. We&apos;ll be back up in a few
        minutes. Follow{" "}
        <a href="https://twitter.com/ZuriHQ" className="text-gold">
          @ZuriHQ
        </a>{" "}
        for updates.
      </p>
    </div>
  );
}
