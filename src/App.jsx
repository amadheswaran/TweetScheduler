import { useState } from "react";
import TweetForm from "./components/TweetForm";
import TweetList from "./components/TweetList";
import TweetCalendar from "./components/TweetCalendar";
import TweetAnalytics from "./components/TweetAnalytics";
import DarkModeToggle from "./components/DarkModeToggle";

function App() {
  const [tweets, setTweets] = useState([]);

  const addTweet = (tweet) => {
    setTweets([...tweets, tweet]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Navbar */}
      <header className="flex justify-between items-center px-6 py-4 bg-blue-600 text-white shadow-md">
        <h1 className="text-xl font-bold">Tweet Scheduler</h1>
        <DarkModeToggle />
      </header>

      {/* Main Content */}
      <main className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-1">
          <TweetForm onAddTweet={addTweet} />
        </div>
        <div className="col-span-1">
          <TweetList tweets={tweets} />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <TweetCalendar tweets={tweets} />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <TweetAnalytics tweets={tweets} />
        </div>
      </main>
    </div>
  );
}

export default App;
