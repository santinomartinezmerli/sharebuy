import Stories from 'react-insta-stories'
import { useNavigate } from 'react-router-dom'

function StoryViewer({ storyGroups, activeGroupIndex, onClose, onNextGroup, onPrevGroup }) {
  const navigate = useNavigate()
  const group = storyGroups[activeGroupIndex]

  const stories = group.stories.map(s => ({
    url: s.image_url || null,
    type: s.image_url ? 'image' : 'video',
    duration: 5000,
    header: {
      heading: group.username,
      subheading: s.product,
    },
    seeMore: () => {},
    content: !s.image_url ? () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <span className="text-8xl">{s.emoji ?? '🛍️'}</span>
      </div>
    ) : undefined,
  }))

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md h-full">

        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/user/${group.userId}`)
          }}
          className="absolute top-7 left-3 z-30 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
            {group.username?.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-white text-sm font-medium drop-shadow">{group.username}</span>
        </button>

        <button
          onClick={onClose}
          className="absolute top-7 right-3 z-30 text-white p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <Stories
          key={group.userId}
          stories={stories}
          defaultInterval={5000}
          width="100%"
          height="100%"
          onAllStoriesEnd={onNextGroup}
          keyboardNavigation
          storyContainerStyles={{ backgroundColor: '#000' }}
        />

        <div className="absolute bottom-6 left-3 right-3 text-white pointer-events-none z-20">
          {group.stories[0]?.caption && (
            <p className="text-xs text-white/80 drop-shadow">{group.stories[0].caption}</p>
          )}
          {group.stories[0]?.price && (
            <p className="text-green-300 text-xs mt-1 drop-shadow">${group.stories[0].price}</p>
          )}
        </div>

      </div>
    </div>
  )
}

export default StoryViewer
