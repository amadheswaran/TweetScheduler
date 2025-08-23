// src/utils/mockApi.js

// simple in-memory "DB"
let user = { id: 1, email: "demo@example.com" };
let handles = [
  { id: "h1", name: "Demo Account", at: "@demo" },
  { id: "h2", name: "Marketing Bot", at: "@marketing" },
];
let tweets = [
  {
    id: "t1",
    handleId: "h1",
    text: "Welcome to Tweet Scheduler 🚀",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  },
];
let analytics = [
  { date: "2025-08-20", tweets: 3 },
  { date: "2025-08-21", tweets: 5 },
  { date: "2025-08-22", tweets: 2 },
];

export const mockApi = {
  // --- Auth ---
  me: async () => {
    return user; // simulate logged-in user
  },
  login: async (email, password) => {
    user = { id: Date.now(), email };
    return user;
  },
  logout: async () => {
    user = null;
    return true;
  },

  // --- Handles ---
  listHandles: async () => {
    return handles;
  },

  // --- Tweets ---
  listTweets: async () => {
    return tweets;
  },
  createTweet: async (tweet) => {
    const newTweet = { id: Date.now().toString(), ...tweet };
    tweets.push(newTweet);
    return newTweet;
  },
  deleteTweet: async (id) => {
    tweets = tweets.filter((t) => t.id !== id);
    return true;
  },

  // --- Analytics ---
  analyticsSnapshot: async () => {
    return analytics;
  },
};
