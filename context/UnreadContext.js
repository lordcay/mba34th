import React, { createContext, useContext, useMemo, useReducer } from 'react';
import * as Notifications from 'expo-notifications';

const UnreadContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'inc-dm': {
      const key = `dm:${action.otherUserId}`;
      const next = { ...state, [key]: (state[key] || 0) + 1 };
      updateBadge(next);
      return next;
    }
    case 'inc-group': {
      const key = `grp:${action.chatroomId}`;
      const next = { ...state, [key]: (state[key] || 0) + 1 };
      updateBadge(next);
      return next;
    }
    case 'clear-dm': {
      const key = `dm:${action.otherUserId}`;
      const next = { ...state, [key]: 0 };
      updateBadge(next);
      return next;
    }
    case 'clear-group': {
      const key = `grp:${action.chatroomId}`;
      const next = { ...state, [key]: 0 };
      updateBadge(next);
      return next;
    }
    case 'reset-all': {
      updateBadge({});
      return {};
    }
    default:
      return state;
  }
}

function totalCount(map) {
  return Object.values(map || {}).reduce((s, n) => s + (n || 0), 0);
}

async function updateBadge(map) {
  const total = totalCount(map);
  try { await Notifications.setBadgeCountAsync(total); } catch {}
}

export function UnreadProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {});
  const value = useMemo(() => ({ unread: state, dispatch }), [state]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}
