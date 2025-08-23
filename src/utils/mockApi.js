let user = { id: 1, email: "demo@example.com", name: "Demo User" };
let handles = [
  { id: "h1", name: "Demo Account", at: "@demo" },
  { id: "h2", name: "Marketing", at: "@marketing" },
];
let tweets = [
  {
    id: "t1",
    handleId: "h1",
    text: "Welcome to Tweet Scheduler 🚀",
    mediaUrls: [],
    tags: ["welcome"],
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "scheduled"
  }
];
let analytics = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: d.toISOString(),
    impressions: Math.floor(700 + Math.random() * 1700),
    engagementRate: +(0.01 + Math.random() * 0.04).toFixed(3),
  };
});

const genId = () => `id_${Math.random().toString(36).slice(2, 9)}`;

export const mockApi = {
  me: async () => user,
  login: async () => user,
  logout: async () => { user = null; return true; },

  listHandles: async () => handles,

  listTweets: async () =>
    tweets.slice().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),

  createTweet: async (t) => {
    const nt = { ...t, id: genId(), status: "scheduled" };
    tweets.push(nt);
    return nt;
  },

  deleteTweet: async (id) => {
    tweets = tweets.filter(t => t.id !== id);
    return true;
  },

  updateTweet: async (id, patch) => {
    const i = tweets.findIndex(t => t.id === id);
    if (i >= 0) {
      tweets[i] = { ...tweets[i], ...patch };
      return tweets[i];
    }
    throw new Error("Not found");
  },

  analyticsSnapshot: async () => analytics
};
