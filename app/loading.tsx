export default function LoadingPage() {
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div
        className='
            w-16 h-16
            border-4 border-red-600 border-t-transparent
            rounded-full animate-spin
          '
      />
    </div>
  )
}
