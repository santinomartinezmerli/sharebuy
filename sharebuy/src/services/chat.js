import { supabase } from '../lib/supabase'

export const CHAT_PAGE_SIZE = 30

// Columns of public.messages the chat uses.
//
// NOTE: the old chat code read `msg.is_image`, but that column does NOT exist in the real
// database (it is not in the schema dump). It was always undefined, so images have always been
// recognised by the file extension of `content` instead. Do not select it or rely on it.
const COLUMNS = 'id, conversation_id, sender_id, content, created_at, read_at, updated_at'

// The conversation with both users embedded, for the chat header. null if it does not exist.
export async function fetchConversation(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, user1:user1_id(id, username, avatar_url), user2:user2_id(id, username, avatar_url)')
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw error
  return data
}

// One page of a conversation's messages, NEWEST first, which is the order of the chat's
// column-reverse list. The first page is the latest 30; each next page goes further back in time.
// It matches idx_messages_conv_created_id (conversation_id, created_at desc, id desc).
//
// `cursor` is { created_at, id } of the OLDEST message loaded so far, or null for the latest
// messages. created_at is passed back as the original ISO string, never a Date, so no
// microseconds are lost.
//
// Fetches PAGE_SIZE + 1 rows to know if there is an older page and returns PAGE_SIZE.
// nextCursor is undefined when there is nothing older, as useInfiniteQuery expects.
export async function fetchMessagesPage(conversationId, cursor) {
  let query = supabase
    .from('messages')
    .select(COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(CHAT_PAGE_SIZE + 1)

  if (cursor) {
    // (created_at, id) < cursor: older than the oldest message already loaded.
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = rows.length > CHAT_PAGE_SIZE
  const messages = hasMore ? rows.slice(0, CHAT_PAGE_SIZE) : rows
  const oldest = messages[messages.length - 1]

  return {
    messages,
    nextCursor: hasMore && oldest ? { created_at: oldest.created_at, id: oldest.id } : undefined,
  }
}

// Insert a text message and get the saved row back (real id and server date).
export async function sendTextMessage(conversationId, userId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, content })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

// With row level security, an UPDATE or DELETE the user is not allowed to do matches no row and
// returns NO error, so the UI would show a change that was never saved. Asking for the affected
// ids back (.select('id')) lets us see that nothing happened and throw. Both functions do it.
export async function updateMessage(messageId, content, updatedAt) {
  const { data, error } = await supabase
    .from('messages')
    .update({ content, updated_at: updatedAt })
    .eq('id', messageId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Message was not updated (no matching row or no permission)')
}

export async function deleteMessage(messageId) {
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Message was not deleted (no matching row or no permission)')
}
