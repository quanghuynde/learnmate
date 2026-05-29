function isAvatarUrl(value?: string): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

type UserAvatarProps = {
  avatar?: string
  fallback?: string
  className?: string
}

export function UserAvatar({ avatar, fallback = '👤', className = 'w-10 h-10 rounded-full' }: UserAvatarProps) {
  if (isAvatarUrl(avatar)) {
    return (
      <img
        src={avatar}
        alt=""
        className={`${className} object-cover`}
      />
    )
  }

  return (
    <div className={`${className} flex items-center justify-center overflow-hidden`}>
      {avatar || fallback}
    </div>
  )
}
