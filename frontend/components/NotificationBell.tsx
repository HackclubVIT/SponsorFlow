'use client';

import { useState, useEffect } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../actions/mutations';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
    } catch (e) {}
  };

  const markAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      fetchNotifications();
    } catch (e) {}
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-500 hover:text-gray-900 focus:outline-none"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
          <div className="flex justify-between items-center p-3 border-b">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-3 border-b text-sm transition-colors cursor-pointer ${n.read ? 'bg-white' : 'bg-blue-50/50'}`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <p className={`text-gray-800 ${n.read ? '' : 'font-semibold'}`}>{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  {n.companyId && (
                    <Link href={`/companies/${n.companyId}`} className="text-xs text-blue-600 mt-1 inline-block hover:underline" onClick={() => setIsOpen(false)}>
                      View Company
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
