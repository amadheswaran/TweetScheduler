import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { parse, startOfWeek, format, getDay } from "date-fns";

const locales = { "en-US": {} };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function TweetCalendar({ tweets, onReschedule }) {
  const events = tweets.map(t => ({
    id: t.id,
    title: t.text.length > 50 ? t.text.slice(0, 50) + "…" : t.text,
    start: new Date(t.scheduledAt),
    end: new Date(new Date(t.scheduledAt).getTime() + 30*60*1000),
    allDay: false
  }));

  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        style={{ height: 520 }}
        onSelectEvent={(ev) => {
          const iso = prompt("Reschedule to ISO datetime (e.g. 2025-08-25T10:00:00Z):", new Date(ev.start).toISOString());
          if (!iso) return;
          if (onReschedule) onReschedule(ev.id, iso);
        }}
        views={["month", "week", "day", "agenda"]}
        defaultView="week"
        popup
      />
    </div>
  );
}
