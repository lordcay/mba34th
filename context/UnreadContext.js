// import React, { createContext, useContext, useMemo, useReducer } from 'react';
// import * as Notifications from 'expo-notifications';

// const UnreadContext = createContext(null);

// function reducer(state, action) {
//   switch (action.type) {
//     case 'inc-dm': {
//       const key = `dm:${action.otherUserId}`;
//       const next = { ...state, [key]: (state[key] || 0) + 1 };
//       updateBadge(next);
//       return next;
//     }
//     case 'inc-group': {
//       const key = `grp:${action.chatroomId}`;
//       const next = { ...state, [key]: (state[key] || 0) + 1 };
//       updateBadge(next);
//       return next;
//     }
//     case 'clear-dm': {
//       const key = `dm:${action.otherUserId}`;
//       const next = { ...state, [key]: 0 };
//       updateBadge(next);
//       return next;
//     }
//     case 'clear-group': {
//       const key = `grp:${action.chatroomId}`;
//       const next = { ...state, [key]: 0 };
//       updateBadge(next);
//       return next;
//     }
//     case 'reset-all': {
//       updateBadge({});
//       return {};
//     }
//     default:
//       return state;
//   }
// }

// function totalCount(map) {
//   return Object.values(map || {}).reduce((s, n) => s + (n || 0), 0);
// }

// async function updateBadge(map) {
//   const total = totalCount(map);
//   try { await Notifications.setBadgeCountAsync(total); } catch {}
// }

// export function UnreadProvider({ children }) {
//   const [state, dispatch] = useReducer(reducer, {});
//   const value = useMemo(() => ({ unread: state, dispatch }), [state]);
//   return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
// }

// export function useUnread() {
//   return useContext(UnreadContext);
// }


// context/UnreadContext.js
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@unread_state_v1';

const UnreadContext = createContext(null);

const initialState = {
  dmByUserId: {},     // { [otherUserId]: number }
  roomById: {},       // { [chatroomId]: number }
  total: 0,
};

// helpers
const computeTotal = (state) => {
  const dm = Object.values(state.dmByUserId).reduce((a, b) => a + b, 0);
  const rooms = Object.values(state.roomById).reduce((a, b) => a + b, 0);
  return dm + rooms;
};

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate': {
      const next = action.payload || initialState;
      return { ...next, total: computeTotal(next) };
    }

    // ---- DM counters
    case 'bump-dm': {
      const { otherUserId, delta = 1 } = action;
      const dmByUserId = { ...state.dmByUserId, [otherUserId]: (state.dmByUserId[otherUserId] || 0) + delta };
      const next = { ...state, dmByUserId };
      return { ...next, total: computeTotal(next) };
    }
    case 'reset-dm': {
      const { otherUserId } = action;
      if (!(otherUserId in state.dmByUserId)) return state;
      const dmByUserId = { ...state.dmByUserId, [otherUserId]: 0 };
      const next = { ...state, dmByUserId };
      return { ...next, total: computeTotal(next) };
    }
    case 'clear-dm': { // same as reset; included for compatibility with your existing dispatch
      const { otherUserId } = action;
      const dmByUserId = { ...state.dmByUserId, [otherUserId]: 0 };
      const next = { ...state, dmByUserId };
      return { ...next, total: computeTotal(next) };
    }

    // ---- Chatroom counters
    case 'bump-room': {
      const { roomId, delta = 1 } = action;
      const roomById = { ...state.roomById, [roomId]: (state.roomById[roomId] || 0) + delta };
      const next = { ...state, roomById };
      return { ...next, total: computeTotal(next) };
    }
    case 'reset-room': {
      const { roomId } = action;
      if (!(roomId in state.roomById)) return state;
      const roomById = { ...state.roomById, [roomId]: 0 };
      const next = { ...state, roomById };
      return { ...next, total: computeTotal(next) };
    }
    case 'clear-room': { // convenience alias
      const { roomId } = action;
      const roomById = { ...state.roomById, [roomId]: 0 };
      const next = { ...state, roomById };
      return { ...next, total: computeTotal(next) };
    }

    default:
      return state;
  }
}

export const UnreadProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // hydrate from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dispatch({ type: 'hydrate', payload: JSON.parse(raw) });
      } catch {}
    })();
  }, []);

  // persist to storage
  useEffect(() => {
    (async () => {
      try {
        const { total, ...persistable } = state;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
      } catch {}
    })();
  }, [state.dmByUserId, state.roomById]);

  const value = { state, dispatch };
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
};

export const useUnread = () => useContext(UnreadContext);


