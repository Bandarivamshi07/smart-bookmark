"use client"

import { supabase } from "@/src/lib/supabaseClient"
import { useEffect, useState } from "react"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchBookmarks(data.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchBookmarks(session.user.id)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchBookmarks(userId: string) {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    setBookmarks(data || [])
  }

  async function addBookmark() {
    if (!title || !url) return

    await supabase.from("bookmarks").insert([
      { title, url, user_id: user.id }
    ])

    setTitle("")
    setUrl("")
    fetchBookmarks(user.id)
  }

  async function deleteBookmark(id: string) {
    await supabase.from("bookmarks").delete().eq("id", id)
    fetchBookmarks(user.id)
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google"
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (!user) {
    return (
      <div className="p-10">
        <button onClick={signIn}>
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="p-10">
      <h2>Welcome {user.email}</h2>
      <button onClick={signOut}>Logout</button>

      <h3>Add Bookmark</h3>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={addBookmark}>Add</button>

      <h3>Your Bookmarks</h3>
      {bookmarks.map((b) => (
        <div key={b.id}>
          <a href={b.url} target="_blank">
            {b.title}
          </a>
          <button onClick={() => deleteBookmark(b.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
