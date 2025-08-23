import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  addDays,
  startOfWeek,
  startOfDay,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isBefore,
  isValid,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Papa from "papaparse";
import {
  Download,
  Upload,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  UserCircle,
  ImageIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import SortableTweetItem from "./SortableTweetItem";
import { mockApi } from "@/utils/mockApi";

const CHAR_LIMIT = 280;
const CSV_COLUMNS = ["Text", "Image URL", "Tags", "Posting Time"];

function parsePostingTime(val) {
  if (!val) return null;
  // Accept "YYYY-MM-DD HH:mm" or ISO
  const isoLike = val.includes("T") ? val : val.replace(" ", "T");
  const d = new Date(isoLike);
  return isValid(d) ? d : null;
}

function formatForInputLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function validateTweetDraft(d) {
  const issues = [];
  const text = (d.text || "").trim();
  if (!text) issues.push("Text is required");
  if (text.length > CHAR_LIMIT) issues.push(`Tweet exceeds ${CHAR_LIMIT} characters`);
  const dt = d.scheduledAt ? new Date(d.scheduledAt) : null;
  if (!dt || !isValid(dt)) issues.push("Scheduled date is invalid");
  if (dt && isBefore(dt, new Date())) issues.push("Scheduled time must be in the future");
  return issues;
}

function MonthCalendar({ monthDate, tweets, onPrev, onNext, onToday, onMove }) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  const byDay = useMemo(() => {
    const map = {};
    tweets.forEach((t) => {
      const dt = parseISO(t.scheduledAt);
      const key = format(startOfDay(dt), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tweets]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          {format(monthDate, "MMMM yyyy")}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrev}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={onToday}>Today</Button>
          <Button variant="outline" size="icon" onClick={onNext}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const key = format(startOfDay(d), "yyyy-MM-dd");
            const items = byDay[key] || [];
            return (
              <div
                key={key}
                className={`min-h-[120px] border rounded-xl p-2 bg-white ${!isSameMonth(d, monthDate) ? "opacity-40" : ""}`}
              >
                <div className={`text-xs mb-1 ${isSameDay(d, new Date()) ? "font-semibold text-blue-600" : "text-gray-600"}`}>
                  {format(d, "d")}
                </div>
                <div className="flex flex-col gap-1">
                  {items.slice(0, 3).map((t) => (
                    <div key={t.id} className="text-xs rounded-lg border px-2 py-1 bg-[hsl(240,4.8%,95.9%)]">
                      {format(parseISO(t.scheduledAt), "HH:mm")} — {t.text.slice(0, 40)}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[11px] text-gray-500">+{items.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TweetScheduler() {
  const [user, setUser] = useState(null);
  const [handles, setHandles] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [monthDate, setMonthDate] = useState(new Date());

  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(formatForInputLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [mediaUrls, setMediaUrls] = useState("");
  const [tags, setTags] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [occurrences, setOccurrences] = useState(5);

  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  useEffect(() => {
    mockApi.me().then((u) => setUser(u));
    mockApi.listHandles().then((hs) => {
      setHandles(hs);
      if (!selectedHandle && hs.length) setSelectedHandle(hs[0].id);
    });
    refreshTweets();
    mockApi.analyticsSnapshot().then(setAnalytics);
  }, []);

  async function refreshTweets() {
    const list = await mockApi.listTweets();
    setTweets(list);
  }

  function expandRecurrence(base, mode, n) {
    if (mode === "none") return [base];
    const dayStep = mode === "daily" ? 1 : mode === "weekly" ? 7 : 30;
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = addDays(parseISO(base.scheduledAt), i * dayStep);
      out.push({ ...base, scheduledAt: d.toISOString(), id: `${base.id}-${i}` });
    }
    return out;
  }

  async function handleCreateTweet() {
    const draft = {
      text,
      scheduledAt,
      mediaUrls: mediaUrls.split(",").map((s) => s.trim()).filter(Boolean),
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      handleId: selectedHandle,
    };
    const issues = validateTweetDraft({ ...draft, scheduledAt });
    if (issues.length) {
      toast({ title: "Validation errors", description: issues.join(", "), variant: "destructive" });
      return;
    }
    const base = await mockApi.createTweet({ ...draft });
    const clones = expandRecurrence(base, repeat, occurrences);
    const toAdd = repeat === "none" ? [base] : clones;
    if (repeat !== "none") {
      const others = toAdd.slice(1);
      for (const c of others) await mockApi.createTweet({ ...c, id: undefined });
    }
    await refreshTweets();
    setText("");
    setMediaUrls("");
    setTags("");
    setRepeat("none");
    setOccurrences(5);
    setScheduledAt(formatForInputLocal(new Date(Date.now() + 60 * 60 * 1000)));
  }

  async function handleDeleteTweet(id) {
    await mockApi.deleteTweet(id);
    setTweets((prev) => prev.filter((t) => t.id !== id));
  }

  function handleImportCSV(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = Array.isArray(results.data) ? results.data : [];
        let added = 0;
        for (const row of rows) {
          const textV = row["Text"] || row["text"];
          const imgsV = row["Image URL"] || row["Image URLs"] || row["mediaUrls"] || "";
          const tagsV = row["Tags"] || "";
          const timeV = row["Posting Time"] || row["scheduledAt"];
          const dt = parsePostingTime(timeV);
          if (!textV || !dt) continue;
          try {
            const t = await mockApi.createTweet({
              text: String(textV),
              scheduledAt: dt.toISOString(),
              mediaUrls: String(imgsV)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              tags: String(tagsV)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              handleId: selectedHandle,
            });
            added++;
            setTweets((prev) => [...prev, t]);
          } catch (e) {
            // swallow one row error, continue next
          }
        }
        toast({ title: "CSV import", description: `Imported ${added} tweets` });
      },
      error: () => {
        toast({ title: "CSV error", description: "Failed to parse CSV", variant: "destructive" });
      },
    });
  }

  function handleExportCSV() {
    const rows = tweets.map((t) => ({
      Text: t.text,
      "Image URL": (t.mediaUrls || []).join(","),
      Tags: (t.tags || []).join(","),
      "Posting Time": format(parseISO(t.scheduledAt), "yyyy-MM-dd HH:mm"),
    }));
    const csv = Papa.unparse({
      fields: CSV_COLUMNS,
      data: rows.map((r) => CSV_COLUMNS.map((c) => r[c] ?? "")),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tweets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const timelineTweets = useMemo(
    () => tweets.filter((t) => t.handleId === selectedHandle).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [tweets, selectedHandle]
  );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" /> Tweet Scheduler
          </CardTitle>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <UserCircle className="w-4 h-4" /> {user.email}
                </span>
                <Button size="sm" onClick={async () => { await mockApi.logout(); setUser(null); }}>
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={async () => setUser(await mockApi.login())}>
                <LogIn className="w-4 h-4 mr-1" /> Login
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>New Tweet</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Handle</Label>
            <Select value={selectedHandle || ""} onValueChange={setSelectedHandle}>
              <SelectTrigger><SelectValue placeholder="Select handle" /></SelectTrigger>
              <SelectContent>
                {handles.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name} ({h.at})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} />
            <div className={`text-sm ${text.length > CHAR_LIMIT ? "text-red-500" : "text-gray-500"}`}>
              {text.length}/{CHAR_LIMIT}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Schedule at</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Repeat</Label>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {repeat !== "none" && (
              <div>
                <Label>Occurrences</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={occurrences}
                  onChange={(e) => setOccurrences(Math.max(1, Math.min(30, Number(e.target.value || 1))))}
                />
              </div>
            )}
          </div>

          <div>
            <Label>Image URL(s) (comma separated)</Label>
            <Input value={mediaUrls} onChange={(e) => setMediaUrls(e.target.value)} placeholder="https://.../image1.jpg, https://.../image2.png" />
          </div>

          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Launch, Product" />
          </div>

          <Button onClick={handleCreateTweet}>Schedule Tweet</Button>
        </CardContent>
      </Card>

      <MonthCalendar
        monthDate={monthDate}
        tweets={tweets.filter((t) => t.handleId === selectedHandle)}
        onPrev={() => setMonthDate(addDays(startOfMonth(monthDate), -1))}
        onNext={() => setMonthDate(addDays(endOfMonth(monthDate), 1))}
        onToday={() => setMonthDate(new Date())}
        onMove={() => {}}
      />

      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Timeline Queue</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => e.target.files && e.target.files.length && handleImportCSV(e.target.files[0])}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors}>
            <SortableContext items={timelineTweets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {timelineTweets.map((t) => (
                  <SortableTweetItem key={t.id} tweet={t} onDelete={handleDeleteTweet} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Analytics</CardTitle></CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics}>
              <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "EEE")} />
              <YAxis />
              <Tooltip formatter={(value) => (value && value.toFixed ? value.toFixed(2) : value)} />
              <Line type="monotone" dataKey="impressions" />
              <Line type="monotone" dataKey="engagementRate" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
