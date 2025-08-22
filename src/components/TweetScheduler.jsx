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
  _user: null,
  _handles: [
    { id: "h1", name: "Brand", at: "@brand", timezone: "Asia/Kolkata" },
    { id: "h2", name: "Labs", at: "@brandlabs", timezone: "Asia/Kolkata" },
  ],
  _tweets: [],
  _analytics: [],
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
  async createTweet(t) {
    const newT = { ...t, id: genId(), status: "scheduled" };
    this._tweets.push(newT);
    return newT;
  },
  async updateTweet(id, patch) {
    const idx = this._tweets.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this._tweets[idx] = { ...this._tweets[idx], ...patch };
      return this._tweets[idx];
    }
    throw new Error("Not found");
  },
  async deleteTweet(id) {
    this._tweets = this._tweets.filter((t) => t.id !== id);
    return true;
  },
  async analyticsSnapshot() {
    if (!this._analytics.length) {
      const today = startOfDay(new Date());
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        this._analytics.push({
          date: d.toISOString(),
          impressions: Math.floor(1000 + Math.random() * 4000),
          engagementRate: parseFloat((0.01 + Math.random() * 0.05).toFixed(3)),
        });
      }
    }
    return this._analytics;
  },
};

const CHAR_LIMIT = 280;
const isMediaUrl = (u) => /\.(png|jpe?g|gif|mp4|mov|webm)(\?.*)?$/i.test(u.trim());

function validateTweetDraft(d) {
  const issues = [];
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

function SortableTweetItem({ tweet, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tweet.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
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

// … keep going with the rest of your code rewritten to remove all `: Type`, `as`, `Omit<>`, etc.

