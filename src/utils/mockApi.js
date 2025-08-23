// src/utils/mockApi.js
export async function mockApi(endpoint, data) {
  console.log(`[mockApi] called with:`, endpoint, data)

  // simulate network latency
  await new Promise(res => setTimeout(res, 500))

  if (endpoint === "scheduleTweet") {
    return { success: true, scheduledAt: new Date().toISOString(), ...data }
  }

  if (endpoint === "fetchScheduledTweets") {
    return [
      { id: 1, content: "First scheduled tweet", time: "2025-08-24T10:00:00Z" },
      { id: 2, content: "Second scheduled tweet", time: "2025-08-25T14:00:00Z" },
    ]
  }

  return { success: true }
}
