export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/15" />
          <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
        </span>
        <div>
          <p className="text-lg font-medium text-zinc-800">Seu app aparece aqui</p>
          <p className="mt-1 text-sm text-zinc-500">Peça no chat ao lado o que você quer construir.</p>
        </div>
      </div>
    </div>
  );
}