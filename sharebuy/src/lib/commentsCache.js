// One cached list of comments per post.
export const commentsKey = (postId) => ['comments', postId]

// Pages are { comments, count, nextCursor }; only the first page carries `count` (the total).
const mapPages = (queryClient, postId, fn) =>
  queryClient.setQueryData(commentsKey(postId), (old) =>
    old?.pages ? { ...old, pages: fn(old.pages) } : old
  )

// Add a comment at the end of the last loaded page and count it. If the list is not in the
// cache yet there is nothing to add to (it will load with the comment included).
export function appendComment(queryClient, postId, comment) {
  mapPages(queryClient, postId, (pages) =>
    pages.map((page, i) => ({
      ...page,
      comments: i === pages.length - 1 ? [...page.comments, comment] : page.comments,
      count: i === 0 && page.count != null ? page.count + 1 : page.count,
    }))
  )
}

// Swap a comment for another one (the temporary one for the saved one), wherever it is.
export function replaceComment(queryClient, postId, commentId, next) {
  mapPages(queryClient, postId, (pages) =>
    pages.map((page) => ({
      ...page,
      comments: page.comments.map((c) => (c.id === commentId ? next : c)),
    }))
  )
}

// Change fields of one comment, wherever it is.
export function patchComment(queryClient, postId, commentId, patch) {
  mapPages(queryClient, postId, (pages) =>
    pages.map((page) => ({
      ...page,
      comments: page.comments.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
    }))
  )
}

// Remove a comment and, only if it was really there, take one off the total.
export function removeComment(queryClient, postId, commentId) {
  mapPages(queryClient, postId, (pages) => {
    const found = pages.some((page) => page.comments.some((c) => c.id === commentId))
    return pages.map((page, i) => ({
      ...page,
      comments: page.comments.filter((c) => c.id !== commentId),
      count: i === 0 && found && page.count != null ? page.count - 1 : page.count,
    }))
  })
}

function compareComments(a, b) {
  const ta = Date.parse(a.created_at)
  const tb = Date.parse(b.created_at)
  if (ta !== tb) return ta - tb
  // Same millisecond: Date.parse drops microseconds, so use the full text when both have the
  // same format (two saved comments), then the id.
  if (a.created_at !== b.created_at && a.created_at.length === b.created_at.length) {
    return a.created_at < b.created_at ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

// All the loaded comments as one list, oldest first, each comment once. A comment can be in two
// places (the one the user just posted may also arrive in a later page), so duplicates by id are
// dropped and the list is sorted, which also puts a just-posted comment in its right place when
// older pages load afterwards.
export function flattenComments(data) {
  if (!data?.pages) return []
  const byId = new Map()
  for (const page of data.pages) {
    for (const comment of page.comments) {
      if (!byId.has(comment.id)) byId.set(comment.id, comment)
    }
  }
  return [...byId.values()].sort(compareComments)
}
