import { useEffect, useState } from "react";
import { mockApi } from "./utils/mockApi";
import DarkModeToggle from "./components/DarkModeToggle";
import TweetForm from "./components/TweetForm";
import TweetList from "./components/TweetList";
import TweetCalendar from "./components/TweetCalendar";
import TweetAnalytics from "./components/TweetAnalytics";

export default function App() {
  const [user, setUser] = useState(null);
  const [handles, setHandles] = useState([]);
  const [tweets, setTweets] = useState([]);

  useEffect(() => {
    (async () => {
      const u = await mockApi.me();
      setUser(u);
      setHandles(await mockApi.listHandles());
      setTweets(await mockApi.listTweets());
    })();
  }, []);

  async function onCreated(t) {
    setTweets(prev => [...prev, t].sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)));
  }

  async function onDelete(id) {
    await mockApi.deleteTweet(id);
    setTweets(prev => prev.filter(t => t.id !== id));
  }

  async function onReschedule(id, iso) {
    const updated = await mockApi.updateTweet(id, { scheduledAt: iso });
    setTweets(prev => prev.map(t => t.id === id ? updated : t).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="w-full bg-blue-600 text-white sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-lg font-semibold">Tweet Scheduler</div>
          <div className="ml-auto flex items-center gap-3">
            {user ? <div className="text-sm opacity-90">{user.email}</div> : <div className="text-sm opacity-90">Guest</div>}
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TweetForm handles={handles} onCreated={onCreated} />
        </div>
        <div className="lg:col-span-2">
          <TweetCalendar tweets={tweets} onReschedule={onReschedule} />
        </div>
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TweetList tweets={tweets} onDelete={onDelete} />
          <TweetAnalytics />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-gray-500 dark:text-gray-400">
        v0.2.0 • Demo
      </footer>
    </div>
  );
}
