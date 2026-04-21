"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PlusCircle, Trash2, Eye, EyeOff, ExternalLink, Star, StarOff } from "lucide-react";

interface CricketArticle {
  id: string;
  slug: string;
  title: string;
  section: "cricket" | "ipl";
  author: string;
  is_published: boolean;
  featured: boolean;
  published_at: string | null;
  created_at: string;
}

interface FeaturedMatch {
  id: string;
  section: string;
  match_id: string | null;
  custom_headline: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

type Tab = "articles" | "featured";

export default function AdminCricketPage() {
  const [tab, setTab] = useState<Tab>("articles");
  const [articles, setArticles] = useState<CricketArticle[]>([]);
  const [featured, setFeatured] = useState<FeaturedMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (section) params.set("section", section);
    const res = await fetch(`/api/admin/cricket/articles?${params}`);
    const data = await res.json();
    setArticles(data.articles ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, section]);

  const fetchFeatured = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/cricket/featured");
    const data = await res.json();
    setFeatured(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "articles") fetchArticles();
    else fetchFeatured();
  }, [tab, fetchArticles, fetchFeatured]);

  const togglePublished = async (id: string, current: boolean) => {
    await fetch(`/api/admin/cricket/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !current }),
    });
    fetchArticles();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await fetch(`/api/admin/cricket/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !current }),
    });
    fetchArticles();
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/admin/cricket/articles/${id}`, { method: "DELETE" });
    fetchArticles();
  };

  const deleteFeatured = async (id: string) => {
    if (!confirm("Remove this featured match?")) return;
    await fetch(`/api/admin/cricket/featured/${id}`, { method: "DELETE" });
    fetchFeatured();
  };

  return (
    <div className="relative z-10 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Cricket CMS</h1>
          <p className="text-gray-400 text-sm">Editorial content for Cricket &amp; IPL sections</p>
        </div>
        <Link
          href="/admin/cricket/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-sm font-bold transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Article
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
        {(["articles", "featured"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all capitalize ${
              tab === t
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "articles" ? `Articles (${total})` : "Featured Matches"}
          </button>
        ))}
      </div>

      {tab === "articles" && (
        <>
          {/* Section filter */}
          <div className="flex gap-3 mb-6">
            <select
              value={section}
              onChange={(e) => { setSection(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              <option value="" className="bg-gray-900">All sections</option>
              <option value="cricket" className="bg-gray-900">International Cricket</option>
              <option value="ipl" className="bg-gray-900">IPL</option>
            </select>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-24">Section</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-32">Author</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-28">Created</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td></tr>
                ) : articles.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">No articles yet</td></tr>
                ) : (
                  articles.map((a) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium line-clamp-1">{a.title}</p>
                        {!a.is_published && (
                          <span className="text-xs text-gray-500">Draft</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                          a.section === "ipl"
                            ? "text-yellow-400 bg-yellow-900/30"
                            : "text-green-400 bg-green-900/30"
                        }`}>
                          {a.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{a.author}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePublished(a.id, a.is_published)}
                            title={a.is_published ? "Unpublish" : "Publish"}
                            className="text-gray-500 hover:text-yellow-400 transition-colors"
                          >
                            {a.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => toggleFeatured(a.id, a.featured)}
                            title={a.featured ? "Unfeature" : "Feature"}
                            className="text-gray-500 hover:text-yellow-400 transition-colors"
                          >
                            {a.featured ? <Star className="w-4 h-4 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
                          </button>
                          <Link
                            href={`/admin/cricket/${a.id}/edit`}
                            className="text-gray-500 hover:text-yellow-400 transition-colors"
                            title="Edit"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => deleteArticle(a.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "featured" && (
        <>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider">Match ID / Headline</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-24">Section</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-16">Order</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-20">Active</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td></tr>
                ) : featured.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">No featured matches yet</td></tr>
                ) : (
                  featured.map((f) => (
                    <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{f.custom_headline ?? f.match_id ?? "—"}</p>
                        {f.match_id && <p className="text-xs text-gray-500">Match #{f.match_id}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                          f.section === "ipl"
                            ? "text-yellow-400 bg-yellow-900/30"
                            : "text-green-400 bg-green-900/30"
                        }`}>
                          {f.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{f.sort_order}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${f.is_active ? "text-green-400" : "text-gray-500"}`}>
                          {f.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteFeatured(f.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add featured match form */}
          <AddFeaturedForm onAdded={fetchFeatured} />
        </>
      )}
    </div>
  );
}

function AddFeaturedForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ section: "ipl", match_id: "", custom_headline: "", sort_order: "0" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/cricket/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: form.section,
        match_id: form.match_id || null,
        custom_headline: form.custom_headline || null,
        sort_order: parseInt(form.sort_order) || 0,
      }),
    });
    setForm({ section: "ipl", match_id: "", custom_headline: "", sort_order: "0" });
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 bg-white/[0.02] border border-white/10 rounded-xl">
      <h3 className="text-sm font-bold text-gray-300 mb-4">Pin a Featured Match</h3>
      <div className="grid grid-cols-4 gap-3">
        <select
          value={form.section}
          onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="ipl" className="bg-gray-900">IPL</option>
          <option value="cricket" className="bg-gray-900">Cricket</option>
        </select>
        <input
          type="text"
          placeholder="Cricbuzz Match ID"
          value={form.match_id}
          onChange={(e) => setForm((p) => ({ ...p, match_id: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Custom headline (optional)"
          value={form.custom_headline}
          onChange={(e) => setForm((p) => ({ ...p, custom_headline: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Sort order"
          value={form.sort_order}
          onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
      >
        {saving ? "Pinning..." : "Pin Match"}
      </button>
    </form>
  );
}
