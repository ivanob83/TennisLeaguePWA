export default function Home({ appName }) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold">Hello World</h1>
        <p className="mt-3 text-base text-slate-600">
          {appName} is ready.
        </p>
      </div>
    </main>
  )
}
