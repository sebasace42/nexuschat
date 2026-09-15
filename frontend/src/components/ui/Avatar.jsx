const Avatar = ({ user, size = 36, className = '' }) => {
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase() : '??';

  // Si el usuario tiene foto de perfil (Cloudinary), la mostramos
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user?.username ? `Foto de perfil de ${user.username}` : 'Foto de perfil'}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Si no, el avatar de color con iniciales (comportamiento original)
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