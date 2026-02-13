"use client"

import { supabase } from "@/src/lib/supabaseClient"
import { useEffect, useState } from "react"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(true)

  // --------------------------------------------------
  // AUTH + INITIAL LOAD
  // --------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        await fetchBookmarks(data.user.id)
        subscribeToRealtime(data.user.id)
      }
      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchBookmarks(session.user.id)
        subscribeToRealtime(session.user.id)
      } else {
        setBookmarks([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // FETCH BOOKMARKS
  // --------------------------------------------------
  async function fetchBookmarks(userId: string) {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("FETCH ERROR:", error)
      return
    }

    setBookmarks(data || [])
  }

  // --------------------------------------------------
  // REALTIME SUBSCRIPTION
  // --------------------------------------------------
  function subscribeToRealtime(userId: string) {
    supabase
      .channel("bookmarks-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchBookmarks(userId)
        }
      )
      .subscribe()
  }

  // --------------------------------------------------
  // ADD BOOKMARK
  // --------------------------------------------------
  async function addBookmark() {
    if (!title || !url || !user) return

    const { error } = await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id,
    })

    if (error) {
      console.error("INSERT ERROR:", error)
      return
    }

    setTitle("")
    setUrl("")
  }

  // --------------------------------------------------
  // DELETE BOOKMARK
  // --------------------------------------------------
  async function deleteBookmark(id: string) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("DELETE ERROR:", error)
    }
  }

  // --------------------------------------------------
  // AUTH ACTIONS
  // --------------------------------------------------
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  if (loading) return <div className="p-10">Loading...</div>

  if (!user) {
    return (
      <div className="p-10">
        <button onClick={signIn} className="border px-4 py-2">
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="p-10 space-y-4">
      <div className="flex justify-between">
        <h2>Welcome {user.email}</h2>
        <button onClick={signOut} className="border px-3 py-1">
          Logout
        </button>
      </div>

      <div className="space-x-2">
        <input
          className="border px-2 py-1"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border px-2 py-1"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button onClick={addBookmark} className="border px-3 py-1">
          Add
        </button>
      </div>

      <div>
        <h3 className="font-semibold">Your Bookmarks</h3>
        {bookmarks.length === 0 && <p>No bookmarks yet.</p>}

        {bookmarks.map((b) => (
          <div key={b.id} className="flex items-center space-x-2 mt-2">
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {b.title}
            </a>
            <button
              onClick={() => deleteBookmark(b.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
