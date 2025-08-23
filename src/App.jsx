import React from 'react'
import TweetScheduler from './components/TweetScheduler'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 text-xl font-semibold">
        Tweet Scheduler
      </header>
      <main className="flex-1 p-4">
        <TweetScheduler />
      </main>
      <footer className="bg-gray-200 p-4 text-center text-sm">
        © 2025 TweetScheduler | Support | Settings
      </footer>
    </div>
  )
}

export default App
