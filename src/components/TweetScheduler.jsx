import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, addDays, startOfWeek, isBefore, parseISO, isValid, startOfDay, setHours, setMinutes } from "date-fns";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Papa from "papaparse";
import { Download, Upload, Calendar as CalendarIcon, LogIn, LogOut, UserCircle, ImageIcon, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const genId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
};

const mockApi = {
  _user: null as null | { id: string; email: string; name: string },
  _handles: [
    { id: "h1", name: "Brand", at: "@brand", timezone: "Asia/Kolkata" },
    { id: "h2", name: "Labs", at: "@brandlabs", timezone: "Asia/Kolkata" },
  ] as Handle[],
  _tweets: [] as Tweet[],
  _analytics: [] as AnalyticsPoint[],
  async login() {
    this._user = { id: "u1", email: "demo@example.com", name: "Demo User" };
    return this._user;
  },
  async logout() {
    this._user = null;
    return true;
  },
  async me() {
    return this._user;
  },
  async listHandles() {
    return this._handles;
  },
  async listTweets() {
    return this._tweets.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },
  async createTweet(t: Omit<Tweet, "id" | "status">) {
    const newT: Tweet = { ...t, id: genId(), status: "scheduled" };
    this._tweets.push(newT);
    return newT;
  },
  async updateTweet(id: string, patch: Partial<Tweet>) {
    const idx = this._tweets.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this._tweets[idx] = { ...this._tweets[idx], ...patch };
      return this._tweets[idx];
    }
    throw new Error("Not found");
  },
  async deleteTweet(id: string) {
    this._tweets = this._tweets.filter((t) => t.id !== id);
    return true;
  },
  async analyticsSnapshot(): Promise<AnalyticsPoint[]> {
    if (!this._analytics.length) {
      const today = startOfDay(new Date());
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        this._analytics.push({ date: d.toISOString(), impressions: Math.floor(1000 + Math.random() * 4000), engagementRate: parseFloat((0.01 + Math.random() * 0.05).toFixed(3)) });
      }
    }
    return this._analytics;
  },
};

const CHAR_LIMIT = 280;
const isMediaUrl = (u: string) => /\.(png|jpe?g|gif|mp4|mov|webm)(\?.*)?$/i.test(u.trim());

function validateTweetDraft(d: { text: string; mediaUrls: string[]; scheduledAt: string; handleId: string }) {
  const issues: string[] = [];
  if (!d.text?.trim()) issues.push("Text is required");
  if (d.text.length > CHAR_LIMIT) issues.push(`Tweet exceeds ${CHAR_LIMIT} characters`);
  const dt = new Date(d.scheduledAt);
  if (!isValid(dt)) issues.push("Scheduled date is invalid");
  if (isValid(dt) && isBefore(dt, new Date())) issues.push("Scheduled time must be in the future");
  const imgs = d.mediaUrls.filter((m) => /\.(png|jpe?g)$/i.test(m));
  const gifs = d.mediaUrls.filter((m) => /\.gif$/i.test(m));
  const videos = d.mediaUrls.filter((m) => /\.(mp4|mov|webm)$/i.test(m));
  if (gifs.length > 1) issues.push("Only one GIF allowed");
  if (videos.length > 1) issues.push("Only one video allowed");
  if (imgs.length > 4) issues.push("Max 4 images allowed");
  if (gifs.length && (imgs.length || videos.length)) issues.push("GIF cannot be combined with images/videos");
  if (videos.length && (imgs.length || gifs.length)) issues.push("Video cannot be combined with images/GIFs");
  d.mediaUrls.forEach((u) => {
    if (!isMediaUrl(u)) issues.push(`Invalid media URL: ${u}`);
  });
  return issues;
}

function SortableTweetItem({ tweet, onDelete }: { tweet: Tweet; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tweet.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-start gap-3 p-3 border rounded-2xl bg-white shadow-sm">
      <div className="mt-1"><CalendarIcon className="w-4 h-4" /></div>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{format(parseISO(tweet.scheduledAt), "EEE, dd MMM • HH:mm")}</div>
        <div className="font-medium whitespace-pre-wrap">{tweet.text}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {tweet.mediaUrls.map((m) => (
            <Badge key={m} variant="secondary" className="flex items-center gap-1"><ImageIcon className="w-3 h-3" />{m.split("/").pop()}</Badge>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
          <span>Status: {tweet.status}</span>
          <span>Tags: {tweet.tags.join(", ") || "—"}</span>
        </div>
      </div>
      <Button variant="ghost" onClick={() => onDelete(tweet.id)}>Delete</Button>
    </div>
  );
}

function WeekCalendar({ start, tweets, onDropToSlot }: { start: Date; tweets: Tweet[]; onDropToSlot: (tweetId: string, dt: Date) => void }) {
  const days = new Array(7).fill(0).map((_, i) => addDays(start, i));
  const hours = new Array(13).fill(0).map((_, i) => i + 8);
  return (
    <div className="w-full overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(180px, 1fr))` }}>
        <div></div>
        {days.map((d) => (
          <div key={d.toISOString()} className="p-2 text-sm font-medium sticky top-0 bg-gray-50 z-10 border-b">{format(d, "EEE dd MMM")}</div>
        ))}
        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="p-2 text-xs text-gray-500 border-r bg-gray-50">{`${h}:00`}</div>
            {days.map((d) => {
              const slot = setMinutes(setHours(d, h), 0);
              const slotTweets = tweets.filter((t) => {
                const dt = parseISO(t.scheduledAt);
                return dt.getFullYear() === slot.getFullYear() && dt.getMonth() === slot.getMonth() && dt.getDate() === slot.getDate() && dt.getHours() === slot.getHours();
              });
              return <CalendarSlot key={d.toISOString() + h} date={slot} items={slotTweets} onDrop={(id) => onDropToSlot(id, slot)} />;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CalendarSlot({ date, items, onDrop }: { date: Date; items: Tweet[]; onDrop: (tweetId: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className="min-h-[90px] border p-2 hover:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col gap-2">
        {items.map((t) => (
          <DraggableChip key={t.id} id={t.id} label={t.text.slice(0, 40) + (t.text.length > 40 ? "…" : "")} />
        ))}
      </div>
    </div>
  );
}

function DraggableChip({ id, label }: { id: string; label: string }) {
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", id)} className="text-xs px-2 py-1 rounded-full bg-white border shadow-sm cursor-grab active:cursor-grabbing">
      {label}
    </div>
  );
}

function CsvUploadPanel({ handles, onRowsAccepted }: { handles: Handle[]; onRowsAccepted: (rows: Omit<Tweet, "id" | "status">[]) => void }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [rowsPreview, setRowsPreview] = useState<any[]>([]);
  function downloadTemplate() {
    const csv = `text,media_urls,scheduled_at,handle,tags,thread_id\n"Launching v2 today!",https://example.com/img1.jpg;https://example.com/img2.jpg,${new Date(Date.now() + 3600_000).toISOString()},@brand,Launch;Product,grp-1`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tweet_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleFile(file: File) {
    setErrors([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data as any[];
        const accepted: Omit<Tweet, "id" | "status">[] = [];
        const newErrors: string[] = [];
        parsed.forEach((r, idx) => {
          const media = (r.media_urls || "").split(";").map((s: string) => s.trim()).filter(Boolean);
          const handle = handles.find((h) => h.at === r.handle || h.name === r.handle);
          const draft = { text: (r.text || "").toString(), mediaUrls: media, scheduledAt: (r.scheduled_at || "").toString(), handleId: handle?.id || "", tags: (r.tags || "").split(";").map((s: string) => s.trim()).filter(Boolean), threadId: r.thread_id || null };
          const problems = validateTweetDraft(draft);
          if (!draft.handleId) problems.push(`Unknown handle: ${r.handle}`);
          if (problems.length) newErrors.push(`Row ${idx + 2}: ${problems.join("; ")}`); else accepted.push(draft);
        });
        setRowsPreview(parsed);
        setErrors(newErrors);
        if (accepted.length) onRowsAccepted(accepted);
      },
      error: (err) => setErrors([err.message]),
    });
  }
  return (
    <Card className="border-dashed">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><Upload className="w-4 h-4" /> CSV Upload</CardTitle>
        <Button variant="secondary" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Template</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input type="file" accept=".csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
            <div className="font-medium mb-1">Validation issues</div>
            <ul className="list-disc ml-5 space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
        {rowsPreview.length > 0 && (<div className="text-xs text-gray-500">Parsed {rowsPreview.length} rows. Accepted rows were added to the queue if valid.</div>)}
      </CardContent>
    </Card>
  );
}

function localDateTimeValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Composer({ handles, onCreate }: { handles: Handle[]; onCreate: (t: Omit<Tweet, "id" | "status">) => void }) {
  const [text, setText] = useState("");
  const [mediaInput, setMediaInput] = useState("");
  const [handleId, setHandleId] = useState(handles[0]?.id || "");
  const [scheduledAt, setScheduledAt] = useState(localDateTimeValue(new Date(Date.now() + 3600_000)));
  const [tags, setTags] = useState("");
  const { toast } = useToast();
  useEffect(() => {
    if (handles.length && !handles.find((h) => h.id === handleId)) setHandleId(handles[0].id);
  }, [handles]);
  const mediaUrls = useMemo(() => mediaInput.split("\n").map((s) => s.trim()).filter(Boolean), [mediaInput]);
  const previewIssues = useMemo(() => validateTweetDraft({ text, mediaUrls, scheduledAt, handleId }), [text, mediaUrls, scheduledAt, handleId]);
  function submit() {
    const draft: Omit<Tweet, "id" | "status"> = { text, mediaUrls, scheduledAt: new Date(scheduledAt).toISOString(), handleId, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), threadId: null };
    const issues = validateTweetDraft({ ...draft, scheduledAt });
    if (issues.length) {
      toast({ title: "Fix validation issues", description: issues.join("; ") });
      return;
    }
    onCreate(draft);
    setText("");
    setMediaInput("");
    setTags("");
    toast({ title: "Scheduled", description: "Tweet added to the queue." });
  }
  const chLeft = CHAR_LIMIT - text.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Composer</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Handle</Label>
            <Select value={handleId} onValueChange={setHandleId}>
              <SelectTrigger><SelectValue placeholder="Select handle" /></SelectTrigger>
              <SelectContent>
                {handles.map((h) => <SelectItem key={h.id} value={h.id}>{h.name} ({h.at})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="What’s happening?" />
            <div className={`text-xs ${chLeft < 0 ? "text-red-600" : "text-gray-500"}`}>{chLeft} characters left</div>
          </div>
          <div className="grid gap-2">
            <Label>Media URLs (one per line)</Label>
            <Textarea value={mediaInput} onChange={(e) => setMediaInput(e.target.value)} rows={3} placeholder="https://…/image1.jpg" />
            <div className="flex gap-2 flex-wrap">
              {mediaUrls.map((m) => <Badge key={m} variant="secondary" className="flex items-center gap-1"><ImageIcon className="w-3 h-3" />{m.split("/").pop()}</Badge>)}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Schedule at</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Tags (comma separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Launch, Product" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={submit}>Schedule</Button>
          </div>
        </div>
        <div className="space-y-3">
          <Card className="bg-gray-50">
            <CardHeader><CardTitle className="text-sm">Smart Preview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">{text || <span className="italic text-gray-400">Your tweet preview appears here…</span>}</div>
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {mediaUrls.map((m) => (
                    <div key={m} className="aspect-video bg-white border rounded-xl overflow-hidden flex items-center justify-center text-xs">
                      <span className="px-2 break-all">{m}</span>
                    </div>
                  ))}
                </div>
              )}
              {previewIssues.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                  <div className="font-medium mb-1">Warnings</div>
                  <ul className="list-disc ml-5 space-y-1">{previewIssues.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              ) : (
                <div className="text-xs text-green-700">All checks look good.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsPoint[]>([]);
  useEffect(() => { mockApi.analyticsSnapshot().then(setData); }, []);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Analytics snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.map((d) => ({ date: format(parseISO(d.date), "MMM d"), impressions: d.impressions }))}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="impressions" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AppHeader({ user, handles, currentHandleId, setHandleId, onLogin, onLogout }: { user: any; handles: Handle[]; currentHandleId: string; setHandleId: (id: string) => void; onLogin: () => void; onLogout: () => void }) {
  return (
    <div className="w-full bg-white border-b sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-lg"><CalendarIcon className="w-5 h-5" /> Tweet Scheduler</div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Label className="text-xs text-gray-500">Handle</Label>
            <Select value={currentHandleId} onValueChange={setHandleId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {handles.map((h) => <SelectItem key={h.id} value={h.id}>{h.name} ({h.at})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600"><UserCircle className="w-4 h-4" /> {user.name}</div>
              <Button variant="outline" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />Logout</Button>
            </>
          ) : (
            <Button onClick={onLogin}><LogIn className="w-4 h-4 mr-2" />Login</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function useInAppReminders(tweets: Tweet[]) {
  const { toast } = useToast();
  useEffect(() => {
    const timers: number[] = [];
    tweets.forEach((t) => {
      const dt = parseISO(t.scheduledAt);
      const msBefore = dt.getTime() - Date.now() - 5 * 60 * 1000;
      if (msBefore > 0) {
        const id = window.setTimeout(() => {
          toast({ title: "Reminder", description: `Tweet scheduled at ${format(dt, "EEE, dd MMM • HH:mm")} is due soon.` });
        }, msBefore);
        timers.push(id);
      }
    });
    return () => timers.forEach((id) => clearTimeout(id));
  }, [tweets]);
}

export default function TweetSchedulerApp() {
  const [user, setUser] = useState<any>(null);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [currentHandleId, setCurrentHandleId] = useState<string>("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  useEffect(() => {
    (async () => {
      const me = await mockApi.me();
      setUser(me);
      const hs = await mockApi.listHandles();
      setHandles(hs);
      setCurrentHandleId(hs[0]?.id || "");
      const tw = await mockApi.listTweets();
      setTweets(tw);
    })();
  }, []);
  useInAppReminders(tweets);
  async function addTweets(rows: Omit<Tweet, "id" | "status">[]) {
    const created: Tweet[] = [];
    for (const r of rows) {
      const t = await mockApi.createTweet(r);
      created.push(t);
    }
    setTweets((prev) => [...prev, ...created].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  }
  async function createTweet(row: Omit<Tweet, "id" | "status">) {
    const t = await mockApi.createTweet(row);
    setTweets((prev) => [...prev, t].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  }
  async function deleteTweet(id: string) {
    await mockApi.deleteTweet(id);
    setTweets((prev) => prev.filter((t) => t.id !== id));
  }
  async function moveTweetTo(id: string, dt: Date) {
    const iso = dt.toISOString();
    const updated = await mockApi.updateTweet(id, { scheduledAt: iso });
    setTweets((prev) => prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  }
  const timelineTweets = tweets.filter((t) => t.handleId === currentHandleId && t.status !== "posted");
  return (
    <div className="min-h-screen bg-[hsl(220,14.3%,97%)]">
      <AppHeader user={user} handles={handles} currentHandleId={currentHandleId} setHandleId={setCurrentHandleId} onLogin={async () => setUser(await mockApi.login())} onLogout={async () => { await mockApi.logout(); setUser(null); }} />
      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-4">
        <div className="space-y-4 lg:col-span-1">
          <Composer handles={handles} onCreate={createTweet} />
          <CsvUploadPanel handles={handles} onRowsAccepted={addTweets} />
          <AnalyticsPanel />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>Prev</Button>
                <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
                <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</Button>
              </div>
            </CardHeader>
            <CardContent>
              <WeekCalendar start={weekStart} tweets={tweets.filter((t) => t.handleId === currentHandleId)} onDropToSlot={(id, dt) => moveTweetTo(id, dt)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Timeline Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext sensors={sensors} onDragEnd={() => {}}>
                <SortableContext items={timelineTweets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-3">
                    {timelineTweets.map((t) => (
                      <SortableTweetItem key={t.id} tweet={t} onDelete={deleteTweet} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-gray-500 flex justify-between">
        <div className="flex gap-4">
          <a href="#">Support</a>
          <a href="#">Status</a>
          <a href="#">Settings</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <div>v0.1.0 • Demo</div>
      </footer>
    </div>
  );
}
