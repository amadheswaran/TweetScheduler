import { useEffect, useMemo, useState } from "react";
import { mockApi } from "../utils/mockApi";
import { format } from "date-fns";

const CHAR_LIMIT = 280;

function localDateTimeValue(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const isMediaUrl = (u) => /\.(png|jpe?g|gif|mp4|mov|webm)(\?.*)?$/i.test((u||"").trim());

function validateTweetDraft(d) {
  const issues = [];
  if (!d.text?.trim()) issues.push("Text is required");
  if (d.text.length > CHAR_LIMIT) issues.push(`Over ${CHAR_LIMIT} characters`);
  const when = new Date(d.scheduledAt);
  if (isNaN(+when)) issues.push("Invalid date/time");
  if (!d.handleId) issues.push("Handle is required");
  const imgs = d.mediaUrls.filter(m => /\.(png|jpe?g)$/i.test(m));
  const gifs = d.mediaUrls.filter(m => /\.gif$/i.test(m));
  const vids = d.mediaUrls.filter(m => /\.(mp4|mov|webm)$/i.test(m));
  if (imgs.length > 4) issues.push("Max 4 images");
  if (gifs.length > 1) issues.push("Only one GIF");
  if (vids.length > 1) issues.push("Only one video");
  if (gifs.length && (imgs.length || vids.length)) issues.push("GIF cannot mix with images/videos");
  if (vids.length && (imgs.length || gifs.length)) issues.push("Video cannot mix with images/GIFs");
  d.mediaUrls.forEach(u => { if (u && !isMediaUrl(u)) issues.push(`Invalid media: ${u}`); });
  return issues;
}

export default function TweetForm({ handles, onCreated }) {
  const [handleId, setHandleId] = useState(handles[0]?.id || "");
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(localDateTimeValue(new Date(Date.now() + 60*60*1000)));
  const [media, setMedia] = useState("");
  const [tags, setTags] = useState("");
  const chLeft = CHAR_LIMIT - text.length;

  useEffect(() => {
    if (handles.length && !handles.find(h => h.id === handleId)) setHandleId(handles[0].id);
  }, [handles]);

  const mediaUrls = useMemo(() => media.split(",").map(s => s.trim()).filter(Boolean), [media]);
  const draft = useMemo(() => ({
    text,
    scheduledAt,
    mediaUrls,
    tags: tags.split(",").map(s => s.trim()).filter(Boolean),
    handleId
  }), [text, scheduledAt, mediaUrls, tags, handleId]);

  const warnings = useMemo(() => validateTweetDraft(draft), [draft]);

  async function submit() {
    const errs = validateTweetDraft(draft);
    if (errs.length) {
      alert("Please fix:\n• " + errs.join("\n• "));
      return;
    }
    const payload = { ...draft, scheduledAt: new Date(scheduledAt).toISOString() };
    const created = await mockApi.createTweet(payload);
    onCreated(created);
    setText("");
    setMedia("");
    setTags("");
  }

  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <h2 className="text-lg font-semibold mb-3">New Tweet</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Handle</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={handleId}
            onChange={(e)=>setHandleId(e.target.value)}
          >
            {handles.map(h => (
              <option key={h.id} value={h.id}>{h.name} ({h.at})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Text</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            rows={4}
            value={text}
            onChange={(e)=>setText(e.target.value)}
            placeholder="What's happening?"
          />
          <div className={`text-xs mt-1 ${chLeft < 0 ? "text-red-600" : "text-gray-500"}`}>
            {text.length}/{CHAR_LIMIT}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Schedule at</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border px-3 py-2"
              value={scheduledAt}
              onChange={(e)=>setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Tags (comma separated)</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={tags}
              onChange={(e)=>setTags(e.target.value)}
              placeholder="Launch, Marketing"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Media URLs (comma separated)</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={media}
            onChange={(e)=>setMedia(e.target.value)}
            placeholder="https://img1.jpg, https://video.mp4"
          />
        </div>

        <button
          onClick={submit}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Schedule Tweet
        </button>

        <div className="bg-gray-50 rounded-lg p-3 border">
          <div className="text-sm font-medium mb-2">Smart Preview</div>
          <div className="text-sm">{text || <span className="text-gray-400 italic">Your tweet preview appears here…</span>}</div>
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {mediaUrls.map(u => (
                <div key={u} className="aspect-video bg-white border rounded-lg text-xs p-2 break-words">{u}</div>
              ))}
            </div>
          )}
          {warnings.length > 0 ? (
            <ul className="mt-2 text-xs text-amber-700 list-disc ml-5">
              {warnings.map((w,i)=><li key={i}>{w}</li>)}
            </ul>
          ) : (
            <div className="mt-2 text-xs text-green-700">All checks look good.</div>
          )}
        </div>
      </div>
    </div>
  );
}
