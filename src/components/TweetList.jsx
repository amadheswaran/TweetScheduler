import { format, parseISO } from "date-fns";

export default function TweetList({ tweets, onDelete }) {
  const sorted = tweets.slice().sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Scheduled Tweets</h2>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <div className="text-sm text-gray-500">No scheduled tweets yet.</div>
        )}
        {sorted.map(t => (
          <div key={t.id} className="border rounded-xl p-3 bg-white">
            <div className="text-xs text-gray-500">
              {format(parseISO(t.scheduledAt), "EEE, dd MMM • HH:mm")}
            </div>
            <div className="mt-1 text-sm whitespace-pre-wrap">{t.text}</div>
            {t.mediaUrls?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                {t.mediaUrls.map(u => (
                  <span key={u} className="px-2 py-1 border rounded-full bg-gray-50">{u.split("/").pop()}</span>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Status: {t.status || "scheduled"}</span>
              <button
                onClick={()=>onDelete && onDelete(t.id)}
                className="ml-auto text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
