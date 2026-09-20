/*
 * Ubicación: src/components/channels/ChannelPostItem.jsx
 */
const ChannelPostItem = ({ post, isOwner, onDelete }) => {
  const time = new Date(post.createdAt).toLocaleString('es', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-panel border border-white/8 rounded-2xl p-4 max-w-lg mx-auto w-full group relative">
      {post.mediaUrl && (
        <div className="mb-2 rounded-xl overflow-hidden">
          {post.mediaType === 'image' && (
            <img src={post.mediaUrl} alt="" className="w-full max-h-80 object-cover" />
          )}
          {post.mediaType === 'video' && (
            <video src={post.mediaUrl} controls className="w-full max-h-80" />
          )}
        </div>
      )}

      {post.text && (
        <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{post.text}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-text-muted">{time}</span>

        {isOwner && (
          <button
            onClick={() => onDelete?.(post._id)}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-accent-red hover:underline transition-opacity"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
};

export default ChannelPostItem;