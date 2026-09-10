import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='max-w-2xl mx-auto text-center'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-900 mb-4'>
          CivicPakistan
        </h1>
        <p className='text-lg text-gray-600 mb-8'>
          AI-assisted civic issue resolution, public transparency, and government accountability platform for Pakistan
        </p>
        
        <div className='space-y-4'>
          <Button size='lg' className='w-full max-w-sm'>
            Get Started
          </Button>
          <p className='text-sm text-gray-500'>
            Part 1 — Foundation + Citizen Core implementation in progress
          </p>
        </div>
      </div>
    </main>
  )
}