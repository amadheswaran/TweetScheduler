import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, addDays, startOfWeek, isBefore, parseISO, isValid, startOfDay } from "date-fns";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Papa from "papaparse";
import { Download, Upload, Calendar as CalendarIcon, LogIn, LogOut, UserCircle, ImageIcon, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import SortableTweetItem from "./SortableTweetItem";
import { mockApi } from "@/utils/mockApi"

const CHAR_LIMIT = 280;

function TweetScheduler() {
  const [user, setUser] = useState(null);
  const [handles, setHandles] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [draft, setDraft] = useState({
    text: "",
    scheduledAt: "",
    mediaUrls: [],
    tags: [],
  });
  const [analytics, setAnalytics] = useState([]);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  useEffect(() => {
    mockApi.me().then((u) => setUser(u));
    mockApi.listHandles().then(setHandles);
    refreshTweets();
    mockApi.analyticsSnapshot().then(setAnalytics);
  }, []);

  async function refreshTweets() {
    const list = await mockApi.listTweets();
    setTweets(list);
  }

  async function handleLogin() {
    const u = await mockApi.login();
    setUser(u);
  }

  async function handleLogout() {
    await mockApi.logout();
    setUser(null);
  }

  async function handleCreateTweet() {
    const issues = validateTweetDraft(draft);
    if (issues.length) {
      toast({ title: "Validation errors", description: issues.join(", "), variant: "destructive" });
      return;
    }
    const t = await mockApi.createTweet({ ...draft, handleId: selectedHandle });
    setTweets([...tweets, t]);
    setDraft({ text: "", scheduledAt: "", mediaUrls: [], tags: [] });
  }

  async function handleDeleteTweet(id) {
    await mockApi.deleteTweet(id);
    setTweets(tweets.filter((t) => t.id !== id));
  }

  function handleImportCSV(file) {
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        for (const row of results.data) {
          if (!row.text || !row.scheduledAt) continue;
          try {
            const t = await mockApi.createTweet({
              text: row.text,
              scheduledAt: row.scheduledAt,
              mediaUrls: row.mediaUrls ? row.mediaUrls.split(";") : [],
              tags: row.tags ? row.tags.split(",") : [],
              handleId: selectedHandle,
            });
            setTweets((prev) => [...prev, t]);
          } catch (e) {
            console.error("Import error", e);
          }
        }
      },
    });
  }

  function handleExportCSV() {
    const csv = Papa.unparse(tweets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tweets.csv";
    a.click();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
                <Button size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
              </>
            ) : (
              <Button size="sm" onClick={handleLogin}><LogIn className="w-4 h-4 mr-1" /> Login</Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Draft Tweet */}
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
            <Textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            <div className={`text-sm ${draft.text.length > CHAR_LIMIT ? "text-red-500" : "text-gray-500"}`}>
              {draft.text.length}/{CHAR_LIMIT}
            </div>
          </div>
          <div>
            <Label>Scheduled At</Label>
            <Input type="datetime-local" value={draft.scheduledAt} onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })} />
          </div>
          <div>
            <Label>Media URLs (comma separated)</Label>
            <Input value={draft.mediaUrls.join(",")} onChange={(e) => setDraft({ ...draft, mediaUrls: e.target.value.split(",") })} />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={draft.tags.join(",")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",") })} />
          </div>
          <Button onClick={handleCreateTweet}>Schedule Tweet</Button>
        </CardContent>
      </Card>

      {/* Tweets List */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Scheduled Tweets</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current.click()}><Upload className="w-4 h-4 mr-1" /> Import</Button>
            <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files.length && handleImportCSV(e.target.files[0])} />
          </div>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors}>
            <SortableContext items={tweets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {tweets.map((t) => (
                  <SortableTweetItem key={t.id} tweet={t} onDelete={handleDeleteTweet} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Analytics</CardTitle></CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics}>
              <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "EEE")} />
              <YAxis />
              <Tooltip formatter={(value) => value.toFixed ? value.toFixed(2) : value} />
              <Line type="monotone" dataKey="impressions" stroke="#8884d8" />
              <Line type="monotone" dataKey="engagementRate" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default TweetScheduler;
