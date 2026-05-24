const Avatar = ({ user, size = 36, className = '' }) => {
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase() : '??';
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none ${className}`}
      style={{
        width: size, height: size,
        background: user?.avatarColor || '#5b4fcf',
        fontSize: Math.round(size * 0.38),
        color: 'white',
        fontFamily: 'Syne, sans-serif',
      }}
    >
      {initials}
    </div>
  );
};
export default Avatar;