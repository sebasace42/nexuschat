export const canUseNotifications = () => typeof window !== 'undefined' && 'Notification' in window;

export const requestNotificationPermission = async () => {
  if (!canUseNotifications()) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showIncomingMessageNotification = ({ senderName, text, conversationId }) => {
  if (!canUseNotifications()) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  const title = `Nuevo mensaje de ${senderName}`;
  const body = text?.length > 120 ? `${text.slice(0, 117)}...` : text;

  const notification = new Notification(title, {
    body,
    tag: `nexuschat-${conversationId}`,
    icon: '/favicon.ico',
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};
