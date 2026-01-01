import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, UserRole, Notification } from '../../types';
import {
  IconSparkles,
  IconBell,
  IconCheckCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconInfo,
} from '../Icons';

const Navbar: React.FC<{
  currentUser: User | null;
  notifications: Notification[];
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
}> = ({ currentUser, notifications, onLogout, onMarkNotificationsRead }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const myNotifications = currentUser
    ? notifications
        .filter((n) => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const handleToggleProfile = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

  const handleLogoClick = () => {
    if (currentUser) {
      if (currentUser.role === UserRole.CLIENT) navigate('/client/dashboard');
      else if (currentUser.role === UserRole.MAID) navigate('/maid/dashboard');
      else if (currentUser.role === UserRole.ADMIN) navigate('/admin/dashboard');
      else navigate('/');
    } else {
      navigate('/');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <IconCheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <IconAlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <IconAlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <IconInfo className="w-5 h-5 text-teal-500" />;
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <IconSparkles className="h-8 w-8 text-teal-600 mr-2" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              MaidServ<span className="text-teal-600">SA</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/help"
              className="text-gray-500 hover:text-teal-600 text-sm font-medium transition-colors"
            >
              Help & FAQ
            </Link>

            {currentUser && (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={handleToggleNotifications}
                    className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors focus:outline-none"
                  >
                    <IconBell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowNotifications(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">
                              {myNotifications.length} Total
                            </span>
                            {unreadCount > 0 && (
                              <button
                                onClick={onMarkNotificationsRead}
                                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {myNotifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              No notifications yet
                            </div>
                          ) : (
                            myNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-teal-50/30' : ''}`}
                              >
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 mt-0.5 mr-3">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-800">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(notification.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}{' '}
                                      " {new Date(notification.timestamp).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={handleToggleProfile}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <span className="text-sm font-medium text-gray-700 hidden md:block">
                      {currentUser.name}
                    </span>
                    <img
                      src={currentUser.avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                    />
                  </button>

                  {showProfileMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProfileMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          Your Profile
                        </Link>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onLogout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {!currentUser && (
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-medium text-white bg-teal-600 px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
