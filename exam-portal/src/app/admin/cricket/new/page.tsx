"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function NewCricketArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    section: "ipl" as "cricket" | "ipl",
    body: "",
    cover_image_url: "",
    author: "Rizz Jobs Team",
    tags: "",
    is_published: false,
    featured: false,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (publish: boolean) => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cricket/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          is_published: publish,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create article");
      }
      router.push("/admin/cricket");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/cricket"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cricket CMS
        </Link>
      </div>

      <h1 className="text-2xl font-black text-white mb-1">New Cricket Article</h1>
      <p className="text-gray-400 text-sm mb-8">Write editorial content for Cricket or IPL sections</p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Article title..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Section <span className="text-red-400">*</span>
            </label>
            <select
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              <option value="ipl" className="bg-gray-900">IPL 2026</option>
              <option value="cricket" className="bg-gray-900">International Cricket</option>
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Cover Image URL
          </label>
          <input
            type="url"
            value={form.cover_image_url}
            onChange={(e) => set("cover_image_url", e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="IPL 2026, MI, Rohit Sharma..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Article Body
          </label>
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            rows={18}
            placeholder="Write the full article (Markdown supported)..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-y font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set("featured", !form.featured)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.featured ? "bg-yellow-500" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.featured ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-gray-300">Feature this article</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-10 pt-6 border-t border-white/10">
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 font-bold text-sm transition-colors disabled:opacity-50"
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
        <Link href="/admin/cricket" className="ml-auto text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Cancel
        </Link>
      </div>
    </div>
  );
}
