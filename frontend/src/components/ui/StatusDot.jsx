const StatusDot = ({ isOnline, size = 11, borderColor = '#1a1b23' }) => (
  <span
    className="absolute bottom-0 right-0 rounded-full border-2"
    style={{
      width: size, height: size,
      background: isOnline ? '#3ba55d' : '#5d5f7a',
      borderColor,
    }}
  />
);
export default StatusDot;