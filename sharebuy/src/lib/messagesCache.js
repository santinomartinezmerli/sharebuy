// One cached message list per conversation. Pages are { messages, nextCursor }; messages inside a
// page, and pages themselves, go from the NEWEST to the OLDEST (the order of the chat's
// column-reverse list). Page 0 holds the latest messages, so new ones are added at its front.
export const messagesKey = (conversationId) => ['messages', conversationId]

export const isTempMessage = (message) => String(message.id).startsWith('temp-')

const allMessages = (data) => data?.pages?.flatMap((page) => page.messages) ?? []

const mapPages = (queryClient, conversationId, fn) =>
  queryClient.setQueryData(messagesKey(conversationId), (old) =>
    old?.pages ? { ...old, pages: fn(old.pages) } : old
  )

const addToFront = (queryClient, conversationId, message) =>
  mapPages(queryClient, conversationId, (pages) =>
    pages.map((page, i) => (i === 0 ? { ...page, messages: [message, ...page.messages] } : page))
  )

// Swap a message for another one wherever it is (a temporary message for the real one).
export function replaceMessage(queryClient, conversationId, messageId, next) {
  mapPages(queryClient, conversationId, (pages) =>
    pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) => (m.id === messageId ? next : m)),
    }))
  )
}

export function patchMessage(queryClient, conversationId, messageId, patch) {
  mapPages(queryClient, conversationId, (pages) =>
    pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    }))
  )
}

export function removeMessage(queryClient, conversationId, messageId) {
  mapPages(queryClient, conversationId, (pages) =>
    pages.map((page) => ({
      ...page,
      messages: page.messages.filter((m) => m.id !== messageId),
    }))
  )
}

// A message I am sending, shown at once with a temporary id.
export function addTempMessage(queryClient, conversationId, temp) {
  addToFront(queryClient, conversationId, temp)
}

// A message arrived through Realtime (INSERT). Returns what it did, mostly for tests:
//   'ignored'   the list is not in the cache (it will load with the message when it opens)
//   'duplicate' that message is already in the list, nothing to do
//   'replaced'  it is MY message coming back while the temporary copy is still pending: the
//               temporary one is swapped for it, so the message is never shown twice, even if
//               the echo arrives before the response of the insert
//   'added'     a new message, added at the front
// Pending temporary messages are matched by text, oldest first, so two identical messages sent
// in a row each take their own echo.
export function addIncomingMessage(queryClient, conversationId, message, myUserId) {
  const data = queryClient.getQueryData(messagesKey(conversationId))
  if (!data?.pages) return 'ignored'

  const current = allMessages(data)
  if (current.some((m) => m.id === message.id)) return 'duplicate'

  if (message.sender_id === myUserId) {
    // The list is newest first, so the LAST matching temporary message is the oldest one.
    const pending = current.filter((m) => isTempMessage(m) && m.content === message.content)
    const temp = pending[pending.length - 1]
    if (temp) {
      replaceMessage(queryClient, conversationId, temp.id, message)
      return 'replaced'
    }
  }

  addToFront(queryClient, conversationId, message)
  return 'added'
}

// The insert of a message I sent came back with the saved row. If its echo already arrived the
// temporary copy is just dropped (or was already replaced); otherwise it is swapped for the saved
// row. Either way there is exactly one copy.
export function confirmSentMessage(queryClient, conversationId, tempId, saved) {
  const data = queryClient.getQueryData(messagesKey(conversationId))
  if (!data?.pages) return
  if (allMessages(data).some((m) => m.id === saved.id)) {
    removeMessage(queryClient, conversationId, tempId)
  } else {
    replaceMessage(queryClient, conversationId, tempId, saved)
  }
}

function compareNewestFirst(a, b) {
  const ta = Date.parse(a.created_at)
  const tb = Date.parse(b.created_at)
  if (ta !== tb) return tb - ta
  // Same millisecond: Date.parse drops microseconds, so use the full text when both have the same
  // format, then the id.
  if (a.created_at !== b.created_at && a.created_at.length === b.created_at.length) {
    return a.created_at < b.created_at ? 1 : -1
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

// All the loaded messages as one list, newest first, each message once. Temporary (not yet saved)
// messages always come first, in the order they were sent, whatever the clock of the phone says.
export function flattenMessages(data) {
  if (!data?.pages) return []
  const byId = new Map()
  for (const page of data.pages) {
    for (const message of page.messages) {
      if (!byId.has(message.id)) byId.set(message.id, message)
    }
  }
  const all = [...byId.values()]
  const temps = all.filter(isTempMessage)
  const saved = all.filter((m) => !isTempMessage(m)).sort(compareNewestFirst)
  return [...temps, ...saved]
}
