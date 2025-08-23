import React from "react";

export default function SortableTweetItem({ tweet, onDelete }) {
  return (
    <div className="flex justify-between items-center p-2 border rounded mb-2">
      <span>{tweet.text}</span>
      <button
        onClick={() => onDelete(tweet.id)}
        className="text-red-500 hover:text-red-700"
      >
        Delete
      </button>
    </div>
  );
}
