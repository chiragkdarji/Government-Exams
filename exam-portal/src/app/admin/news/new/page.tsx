"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";

const CATEGORIES = ["finance", "business", "markets", "economy", "startups"];

export default function NewNewsArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    headline: "",
    category: "finance",
    summary: "",
    content: "",
    cover_image_url: "",
    author: "Rizz Jobs Team",
    is_published: false,
    featured: false,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (publish: boolean) => {
    if (!form.headline.trim()) {
      setError("Headline is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_published: publish }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create article");
      }
      router.push("/admin/news");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/news"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link>
      </div>

      <h1 className="text-2xl font-black text-white mb-1">New Article</h1>
      <p className="text-gray-400 text-sm mb-8">Create a manual news article</p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Headline */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Headline <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Enter article headline..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-base"
          />
        </div>

        {/* Category + Author row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-gray-900">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Author
            </label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Cover image URL */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Cover Image URL
          </label>
          <input
            type="url"
            value={form.cover_image_url}
            onChange={(e) => set("cover_image_url", e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Summary / Excerpt
          </label>
          <textarea
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            rows={3}
            placeholder="Short summary shown in article lists..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
          />
        </div>

        {/* Body content */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Article Body
          </label>
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            rows={16}
            placeholder="Write the full article content here (Markdown supported)..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-600">Markdown is supported. Use ## for headings, **bold**, *italic*, etc.</p>
        </div>

        {/* Featured toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set("featured", !form.featured)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.featured ? "bg-indigo-600" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.featured ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-gray-300">Feature this article (pinned to top)</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-10 pt-6 border-t border-white/10">
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />
          {saving ? "Saving..." : "Publish"}
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold text-sm transition-colors disabled:opacity-50"
        >
          <EyeOff className="w-4 h-4" />
          Save as Draft
        </button>
        <Link
          href="/admin/news"
          className="ml-auto text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
