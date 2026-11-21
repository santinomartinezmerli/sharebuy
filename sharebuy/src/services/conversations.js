import { supabase } from '../lib/supabase'

export const CONVERSATIONS_PAGE_SIZE = 20

// { "<conversation id>": <epoch milliseconds when you last read it> }. Chat writes it to
// localStorage every time a conversation is opened. Anything unreadable counts as "never read".
export function readChatLastRead() {
  try {
    if (typeof localStorage === 'undefined') return {}
    const parsed = JSON.parse(localStorage.getItem('chatLastRead') || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

// One page of the conversation list through the get_conversations RPC
// (supabase/migrations/005_pagination.sql): the other user, the last message, its date and the
// unread count, most recently active first. Blocked users are excluded in SQL.
//
// The unread count is computed in SQL from the chatLastRead map, which is sent with every request.
// `cursor` is { last_message_at, id } of the last conversation of the previous page, or null.
// last_message_at is passed back as the original ISO string, never a Date, so no microseconds
// are lost.
//
// Returns { conversations, nextCursor }; nextCursor is undefined when there is no next page, which
// is what useInfiniteQuery's getNextPageParam expects. has_more comes back on every row.
export async function fetchConversationsPage(cursor) {
  const { data, error } = await supabase.rpc('get_conversations', {
    p_limit: CONVERSATIONS_PAGE_SIZE,
    p_cursor_last_message_at: cursor?.last_message_at ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_last_read: readChatLastRead(),
  })
  if (error) throw error

  const conversations = data ?? []
  const last = conversations[conversations.length - 1]
  const hasMore = conversations[0]?.has_more ?? false
  return {
    conversations,
    nextCursor: hasMore && last ? { last_message_at: last.last_message_at, id: last.id } : undefined,
  }
}
