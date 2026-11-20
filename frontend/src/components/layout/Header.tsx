import { useState, useEffect } from 'react';
import { LogOut, Mail, MessageSquare, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSlackStatus, connectSlack } from '../../services/api';
import { Button } from '../ui/Button';

export default function Header() {
  const { user, logout } = useAuth();
  const [slackConnected, setSlackConnected] = useState(false);

  useEffect(() => {
    getSlackStatus()
      .then((s) => setSlackConnected(s.connected))
      .catch(() => {});
  }, []);

  return (
    <header className="bg-gradient-to-r from-primary-800 to-primary-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ReachInbox</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Slack status */}
            <button
              onClick={() => !slackConnected && connectSlack()}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                slackConnected
                  ? 'bg-green-500/20 text-green-200 cursor-default'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {slackConnected ? (
                <Check className="w-4 h-4" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              {slackConnected ? 'Slack Connected' : 'Connect Slack'}
            </button>

            {/* User info */}
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/20">
                    {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-white leading-none">{user.name}</p>
                  <p className="text-xs text-primary-200 mt-0.5">{user.email}</p>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={logout} className="text-white/70 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
