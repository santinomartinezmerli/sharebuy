const SIZES = {
  xs:  'w-5  h-5  text-[8px]',
  sm:  'w-7  h-7  text-xs',
  md:  'w-9  h-9  text-sm',
  lg:  'w-11 h-11 text-base',
  xl:  'w-16 h-16 text-xl',
}

function Avatar({ url, username, size = 'md' }) {
  return (
    <div className={`${SIZES[size]} rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium overflow-hidden flex-shrink-0`}>
      {url
        ? <img src={url} className="w-full h-full object-cover" alt="" />
        : <span>{username?.slice(0, 2).toUpperCase() ?? '??'}</span>
      }
    </div>
  )
}

export default Avatar
