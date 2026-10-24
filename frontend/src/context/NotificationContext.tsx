"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    body: string;
    time: string;
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    showNotifs: boolean;
    setShowNotifs: (show: boolean) => void;
    addNotification: (type: NotificationType, title: string, body: string) => void;
    markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);

    const addNotification = (type: NotificationType, title: string, body: string) => {
        const n: Notification = {
            id: Date.now(),
            type,
            title,
            body,
            time: new Date().toLocaleTimeString(),
            read: false,
        };
        setNotifications(prev => [n, ...prev].slice(0, 20));
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // Auto-monitor forensic events
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'verentis_audit' && e.newValue) {
                try {
                    const logs = JSON.parse(e.newValue);
                    if (logs.length > 0) {
                        const last = logs[logs.length - 1];
                        // Only notify if it's within the last few seconds to avoid flood on load
                        const timeDiff = Date.now() - new Date(last.timestamp).getTime();
                        if (timeDiff < 10000) {
                          addNotification(
                              last.status === 'valid' ? 'success' : 'error',
                              `Forensic Event: ${last.status.toUpperCase()}`,
                              `${last.fileName} analyzed. Result: ${last.chassis || 'No VIN'}`
                          );
                        }
                    }
                } catch (err) {}
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, showNotifs, setShowNotifs, addNotification, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
