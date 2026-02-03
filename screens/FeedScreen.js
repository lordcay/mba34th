





import React, { useEffect, useMemo, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";




import {
  getTodayGist,
  voteOnGist,
  getGistComments,
  addGistComment,
} from "../services/feed.service";

const ACCENT = "#581845";

const pad2 = (n) => String(n).padStart(2, "0");

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}h : ${pad2(m)}m : ${pad2(s)}s`;
};

export default function FeedScreen() {
  // const firstName = "Alex";

  const { user } = useContext(AuthContext);

const firstName =
  user?.firstName ||
  user?.nickname ||
  (user?.email ? user.email.split("@")[0] : "there");


  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [now, setNow] = useState(Date.now());
  const [voting, setVoting] = useState(false);

  // ✅ keyboard handling
  const [kbHeight, setKbHeight] = useState(0);
  const COMPOSER_HEIGHT = 66; // visual height of composer row
const navigation = useNavigation();
const [profileLoadingId, setProfileLoadingId] = useState(null);
const myId = String(user?._id || user?.id || "");


const goToProfile = async (comment) => {
  const theirId = String(comment?.userId || "");

  if (!theirId) {
    Alert.alert("Profile", "User profile not available for this comment.");
    return;
  }

  // ✅ Prevent navigating to your own profile
  if (theirId === myId) {
    // Option A: do nothing silently
    return;
  }

  try {
    setProfileLoadingId(theirId);

    // ✅ fetch FULL profile first (so UserProfile will not show N/A)
    let res = null;

    // Try common patterns (one of these will match your backend)
    try {
      res = await api.get(`/accounts/${theirId}`);
    } catch (e1) {
      try {
        res = await api.get(`/accounts/profile/${theirId}`);
      } catch (e2) {
        res = await api.get(`/accounts/${theirId}/profile`);
      }
    }

    const fullUser = res?.data?.user || res?.data;

    if (!fullUser) {
      Alert.alert("Profile", "Could not load this profile. Please try again.");
      return;
    }

    // ✅ EXACT SAME NAV PATTERN AS HOME SCREEN
    navigation.navigate("UserProfile", { user: fullUser });
  } catch (e) {
    console.log("Failed to fetch full profile:", e?.response?.data || e?.message);
    Alert.alert("Profile", "Failed to fetch full profile. Please try again.");
  } finally {
    setProfileLoadingId(null);
  }
};



  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates?.height || 0)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // expiresAt from backend
  const expiresAtTs = useMemo(() => {
    if (!post?.expiresAt) return null;
    const t = new Date(post.expiresAt).getTime();
    return Number.isNaN(t) ? null : t;
  }, [post?.expiresAt]);

  const remaining = useMemo(() => {
    if (!expiresAtTs) return 0;
    return Math.max(0, expiresAtTs - now);
  }, [expiresAtTs, now]);

  // tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const mapServerPostToUI = useCallback((serverPost) => {
    return {
      id: serverPost._id || serverPost.id,
      category: "STREET GIST",
      title: serverPost.title,
      body: serverPost.body,
      image: serverPost.imageUrl || serverPost.image || null,

      agreeCount: serverPost.agreeCount ?? serverPost.agree ?? 0,
      disagreeCount: serverPost.disagreeCount ?? serverPost.disagree ?? 0,

      myVote: serverPost.myVote ?? null,

      commentsCount: serverPost.commentCount ?? serverPost.commentsCount ?? 0,
      expiresAt: serverPost.expiresAt,

      reactions: serverPost.reactions || [
        { key: "like", emoji: "👍", count: 0 },
        { key: "fire", emoji: "🔥", count: 0 },
        { key: "wow", emoji: "😮", count: 0 },
        { key: "laugh", emoji: "😂", count: 0 },
        { key: "clap", emoji: "👏", count: 0 },
      ],
    };
  }, []);

  const loadToday = useCallback(async () => {
    const data = await getTodayGist();
    const serverPost = data?.post || data;
    if (!serverPost) {
      setPost(null);
      setComments([]);
      return null;
    }
    const mapped = mapServerPostToUI(serverPost);
    setPost(mapped);
    return mapped;
  }, [mapServerPostToUI]);

  const loadComments = useCallback(async (postId) => {
    try {
      const data = await getGistComments(postId);
      const list = Array.isArray(data) ? data : data?.comments || [];

      const normalized = list.map((c) => {
        const u = c.user || c.author || null;

        const fullName = u?.firstName
          ? `${u.firstName} ${u?.lastName || ""}`.trim()
          : (c.name || c.authorName || "User");

        return {
          id: c._id || c.id,
          userId: u?._id || u?.id || c.userId || c.authorId || null,   // ✅ add this
    userObj: u || null,   
          name: fullName,
          badge: u?.verified ? "Verified" : "Member",
          text: c.text || c.message || "",
          photo: Array.isArray(u?.photos) ? u.photos[0] : u?.photos || null,
        };
      });

      setComments(normalized);
      setPost((p) => (p ? { ...p, commentsCount: normalized.length } : p));
    } catch (e) {
      console.log("getGistComments error:", e?.response?.data || e?.message);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const p = await loadToday();
      if (p?.id) await loadComments(p.id);
    } catch (e) {
      Alert.alert("Feed", "Could not load today’s gist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadToday, loadComments]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!expiresAtTs) return;
    if (remaining > 0) return;
    bootstrap();
  }, [remaining, expiresAtTs, bootstrap]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const p = await loadToday();
      if (p?.id) await loadComments(p.id);
    } catch {
      Alert.alert("Feed", "Refresh failed. Try again.");
    } finally {
      setRefreshing(false);
    }
  }, [loadToday, loadComments]);

  const onVote = async (type) => {
    if (!post?.id || voting) return;
    setVoting(true);

    const prev = post;

    // optimistic
    setPost((p) => {
      if (!p) return p;
      const myVote = p.myVote;

      if (myVote === type) {
        return {
          ...p,
          myVote: null,
          agreeCount: type === "agree" ? Math.max(0, p.agreeCount - 1) : p.agreeCount,
          disagreeCount: type === "disagree" ? Math.max(0, p.disagreeCount - 1) : p.disagreeCount,
        };
      }

      let agree = p.agreeCount;
      let disagree = p.disagreeCount;

      if (myVote === "agree") agree = Math.max(0, agree - 1);
      if (myVote === "disagree") disagree = Math.max(0, disagree - 1);

      if (type === "agree") agree += 1;
      if (type === "disagree") disagree += 1;

      return { ...p, myVote: type, agreeCount: agree, disagreeCount: disagree };
    });

    try {
      const data = await voteOnGist(post.id, type);
      if (data?.post) {
        const mapped = mapServerPostToUI(data.post);
        setPost({ ...mapped, myVote: data.myVote ?? null });
      } else {
        setPost(prev);
      }
    } catch {
      setPost(prev);
    } finally {
      setVoting(false);
    }
  };

  const addComment = async () => {
    const text = commentText.trim();
    if (!text || !post?.id) return;

    const optimistic = {
      id: `tmp_${Date.now()}`,
      name: "You",
      badge: "You",
      text,
      photo: null,
    };

    setComments((prev) => [optimistic, ...prev]);
    setPost((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
    setCommentText("");

    try {
      await addGistComment(post.id, text);
      await loadComments(post.id);
    } catch (e) {
      Alert.alert("Comment", "Could not post comment. Try again.");
      await loadComments(post.id);
    }
  };

  const onReact = (key) => {
    setPost((prev) => {
      if (!prev) return prev;
      const updated = prev.reactions.map((r) =>
        r.key === key ? { ...r, count: r.count + 1 } : r
      );
      return { ...prev, reactions: updated };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 18 }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>No gist available yet.</Text>
          <TouchableOpacity onPress={bootstrap} style={{ marginTop: 12 }}>
            <Text style={{ color: ACCENT, fontWeight: "900" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bottomPad = COMPOSER_HEIGHT + 18; // enough space under list
  const composerBottom = kbHeight > 0 ? kbHeight : 0;
  return (
  <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: bottomPad + composerBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {firstName}!</Text>
          <Text style={styles.subGreeting}>The Street is live today.</Text>
        </View>

        {/* Countdown */}
        <View style={styles.countdownWrap}>
          <Ionicons name="time-outline" size={16} color="#333" />
          <Text style={styles.countdownLabel}>Gist expires in:</Text>
          <View style={styles.countdownPill}>
            <Text style={styles.countdownText}>{formatCountdown(remaining)}</Text>
          </View>
        </View>

        {/* Post card */}
        <View style={styles.card}>
          <Text style={styles.category}>{post.category}</Text>
          <Text style={styles.title}>{post.title}</Text>

          {!!post.image && <Image source={{ uri: post.image }} style={styles.hero} />}
          {!!post.body && <Text style={styles.body}>{post.body}</Text>}

          {/* <Text style={styles.take}>What’s your take?</Text> */}

          {/* Votes */}
          <View style={styles.voteRow}>
            <TouchableOpacity
              disabled={voting}
              onPress={() => onVote("agree")}
              style={[
                styles.voteBtn,
                post.myVote === "agree" && styles.voteBtnActive,
                voting && styles.disabled,
              ]}
            >
               <Text
                style={[
                  styles.voteText,
                  post.myVote === "agree" && styles.voteTextActive,
                ]}
              >
                 {post.agreeCount}
              </Text>
              <Ionicons
                name={post.myVote === "agree" ? "thumbs-up" : "thumbs-up-outline"}
                size={24}
                color={post.myVote === "agree" ? "#fff" : "#111"}
              />
              
            </TouchableOpacity>

            <TouchableOpacity
              disabled={voting}
              onPress={() => onVote("disagree")}
              style={[
                styles.voteBtn,
                post.myVote === "disagree" && styles.voteBtnActiveGray,
                voting && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.voteText,
                  post.myVote === "disagree" && styles.voteTextActive,
                ]}
              >
                {post.disagreeCount}
              </Text>
              <Ionicons
                name={post.myVote === "disagree" ? "thumbs-down" : "thumbs-down-outline"}
                size={24}
                color={post.myVote === "disagree" ? "#fff" : "#111"}
              />
              
            </TouchableOpacity>
          </View>

          {/* Reactions (local for now) */}
         

          {/* Comments */}
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>{post.commentsCount} <Ionicons name="chatbubble-ellipses-outline" size={24} color="#666" /> </Text>
            
          </View>
          {/* Comments */}
         

          <View style={{ marginTop: 8 }}>
            {comments.map((c) => (
  <View key={c.id} style={styles.commentRow}>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => goToProfile(c)}
      style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
    >
      <View style={styles.avatar}>
  {c.photo ? (
    <Image
      source={{
        uri: c.photo.startsWith("http")
          ? c.photo
          : `https://three4th-street-backend.onrender.com${c.photo}`,
      }}
      style={styles.avatarImg}
    />
  ) : (
    <Text style={styles.avatarText}>
      {(c.name?.[0] || "U").toUpperCase()}
    </Text>
  )}
</View>

      {/* <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(c.name?.[0] || "U").toUpperCase()}
        </Text>
      </View> */}
    </TouchableOpacity>

    <View style={{ flex: 1 }}>
      <View style={styles.commentTop}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => goToProfile(c)}>
  <Text style={styles.commentName}>
    {c.name}{profileLoadingId === String(c.userId || "") ? " ..." : ""}
  </Text>
</TouchableOpacity>

      </View>

      <Text style={styles.commentText}>{c.text}</Text>
    </View>
  </View>
))}

          </View>
        </View>
      </ScrollView>

      {/* ✅ Composer that moves above keyboard */}
      <View style={[styles.composer, { bottom: composerBottom }]}>
        {/* <Ionicons name="chatbox-outline" size={18} color="#666" /> */}
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Share your view"
          placeholderTextColor="#999"
          style={styles.composerInput}
          multiline
          returnKeyType="send"
        />
        {/* <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="image-outline" size={20} color="#666" />
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
);


 
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16 },

  header: { marginTop: 6, marginBottom: 10 },
  greeting: { fontSize: 22, fontWeight: "900", color: "#111" },
  subGreeting: { marginTop: 2, color: "#666" },

  countdownWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  countdownLabel: { color: "#333", fontWeight: "700" },
  countdownPill: { backgroundColor: ACCENT, paddingHorizontal: 12,  borderRadius: 12 },
  countdownText: { color: "#fff", fontWeight: "900", letterSpacing: 0.3 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  category: { fontSize: 14, fontWeight: "900", color: ACCENT, marginBottom: 6, letterSpacing: 0.6 },
  title: { fontSize: 18, fontWeight: "900", color: "#111", marginBottom: 10 },

  hero: { width: "100%", height: 190, borderRadius: 16, backgroundColor: "#f2f2f2", marginTop: 6 },
  body: { marginTop: 10, color: "#444", lineHeight: 20 },

  take: { marginTop: 14, color: "#666", fontWeight: "800" },

  voteRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  voteBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    backgroundColor: "#fff",
  },
  voteBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  voteBtnActiveGray: { backgroundColor: "#2f2f2f", borderColor: "#2f2f2f" },
  voteText: { fontWeight: "900", color: "#111" },
  voteTextActive: { color: "#fff" },
  disabled: { opacity: 0.6 },

  reactionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingVertical: 6 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f5f5f7" },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontWeight: "900", color: "#444" },

  commentsHeader: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentsTitle: { fontWeight: "900", color: "#111" },

  commentRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f0e7ef", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "900", color: ACCENT },

  commentTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  // commentName: { fontWeight: "900", color: "#111" },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeVerified: { backgroundColor: "#eaf6ee" },
  badgeMember: { backgroundColor: "#eef2ff" },
  badgeText: { fontWeight: "900", fontSize: 11, color: "#1f7a3a" },

  commentText: { marginTop: 2, color: "#444", lineHeight: 18 },

  composer: {
    position: "absolute",
    left: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    color: "#111",
  },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f5f5f7", alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  commentName: { fontWeight: "900", color: "#111", textDecorationLine: "underline" },
 avatarImg: {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 1,
  borderColor: "#e6d6e4",
},



});






// import React, { useEffect, useMemo, useState, useCallback, useContext } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   RefreshControl,
//   Alert,
//   Keyboard,
//   TouchableWithoutFeedback,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { AuthContext } from "../context/AuthContext";


// import {
//   getTodayGist,
//   voteOnGist,
//   getGistComments,
//   addGistComment,
// } from "../services/feed.service";

// const ACCENT = "#581845";

// const pad2 = (n) => String(n).padStart(2, "0");

// const formatCountdown = (ms) => {
//   const total = Math.max(0, Math.floor(ms / 1000));
//   const h = Math.floor(total / 3600);
//   const m = Math.floor((total % 3600) / 60);
//   const s = total % 60;
//   return `${pad2(h)}h : ${pad2(m)}m : ${pad2(s)}s`;
// };

// export default function FeedScreen() {
//   // const firstName = "Alex";

//   const { user } = useContext(AuthContext);

// const firstName =
//   user?.firstName ||
//   user?.nickname ||
//   (user?.email ? user.email.split("@")[0] : "there");


//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const [post, setPost] = useState(null);
//   const [comments, setComments] = useState([]);
//   const [commentText, setCommentText] = useState("");

//   const [now, setNow] = useState(Date.now());
//   const [voting, setVoting] = useState(false);

//   // ✅ keyboard handling
//   const [kbHeight, setKbHeight] = useState(0);
//   const COMPOSER_HEIGHT = 66; // visual height of composer row

//   useEffect(() => {
//     const show = Keyboard.addListener(
//       Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
//       (e) => setKbHeight(e.endCoordinates?.height || 0)
//     );
//     const hide = Keyboard.addListener(
//       Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
//       () => setKbHeight(0)
//     );
//     return () => {
//       show.remove();
//       hide.remove();
//     };
//   }, []);

//   // expiresAt from backend
//   const expiresAtTs = useMemo(() => {
//     if (!post?.expiresAt) return null;
//     const t = new Date(post.expiresAt).getTime();
//     return Number.isNaN(t) ? null : t;
//   }, [post?.expiresAt]);

//   const remaining = useMemo(() => {
//     if (!expiresAtTs) return 0;
//     return Math.max(0, expiresAtTs - now);
//   }, [expiresAtTs, now]);

//   // tick timer
//   useEffect(() => {
//     const t = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, []);

//   const mapServerPostToUI = useCallback((serverPost) => {
//     return {
//       id: serverPost._id || serverPost.id,
//       category: "STREET GIST",
//       title: serverPost.title,
//       body: serverPost.body,
//       image: serverPost.imageUrl || serverPost.image || null,

//       agreeCount: serverPost.agreeCount ?? serverPost.agree ?? 0,
//       disagreeCount: serverPost.disagreeCount ?? serverPost.disagree ?? 0,

//       myVote: serverPost.myVote ?? null,

//       commentsCount: serverPost.commentCount ?? serverPost.commentsCount ?? 0,
//       expiresAt: serverPost.expiresAt,

//       reactions: serverPost.reactions || [
//         { key: "like", emoji: "👍", count: 0 },
//         { key: "fire", emoji: "🔥", count: 0 },
//         { key: "wow", emoji: "😮", count: 0 },
//         { key: "laugh", emoji: "😂", count: 0 },
//         { key: "clap", emoji: "👏", count: 0 },
//       ],
//     };
//   }, []);

//   const loadToday = useCallback(async () => {
//     const data = await getTodayGist();
//     const serverPost = data?.post || data;
//     if (!serverPost) {
//       setPost(null);
//       setComments([]);
//       return null;
//     }
//     const mapped = mapServerPostToUI(serverPost);
//     setPost(mapped);
//     return mapped;
//   }, [mapServerPostToUI]);

//   const loadComments = useCallback(async (postId) => {
//     try {
//       const data = await getGistComments(postId);
//       const list = Array.isArray(data) ? data : data?.comments || [];

//       const normalized = list.map((c) => {
//         const u = c.user || c.author || null;

//         const fullName = u?.firstName
//           ? `${u.firstName} ${u?.lastName || ""}`.trim()
//           : (c.name || c.authorName || "User");

//         return {
//           id: c._id || c.id,
//           name: fullName,
//           badge: u?.verified ? "Verified" : "Member",
//           text: c.text || c.message || "",
//           photo: Array.isArray(u?.photos) ? u.photos[0] : u?.photos || null,
//         };
//       });

//       setComments(normalized);
//       setPost((p) => (p ? { ...p, commentsCount: normalized.length } : p));
//     } catch (e) {
//       console.log("getGistComments error:", e?.response?.data || e?.message);
//     }
//   }, []);

//   const bootstrap = useCallback(async () => {
//     try {
//       setLoading(true);
//       const p = await loadToday();
//       if (p?.id) await loadComments(p.id);
//     } catch (e) {
//       Alert.alert("Feed", "Could not load today’s gist. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, [loadToday, loadComments]);

//   useEffect(() => {
//     bootstrap();
//   }, [bootstrap]);

//   useEffect(() => {
//     if (!expiresAtTs) return;
//     if (remaining > 0) return;
//     bootstrap();
//   }, [remaining, expiresAtTs, bootstrap]);

//   const onRefresh = useCallback(async () => {
//     try {
//       setRefreshing(true);
//       const p = await loadToday();
//       if (p?.id) await loadComments(p.id);
//     } catch {
//       Alert.alert("Feed", "Refresh failed. Try again.");
//     } finally {
//       setRefreshing(false);
//     }
//   }, [loadToday, loadComments]);

//   const onVote = async (type) => {
//     if (!post?.id || voting) return;
//     setVoting(true);

//     const prev = post;

//     // optimistic
//     setPost((p) => {
//       if (!p) return p;
//       const myVote = p.myVote;

//       if (myVote === type) {
//         return {
//           ...p,
//           myVote: null,
//           agreeCount: type === "agree" ? Math.max(0, p.agreeCount - 1) : p.agreeCount,
//           disagreeCount: type === "disagree" ? Math.max(0, p.disagreeCount - 1) : p.disagreeCount,
//         };
//       }

//       let agree = p.agreeCount;
//       let disagree = p.disagreeCount;

//       if (myVote === "agree") agree = Math.max(0, agree - 1);
//       if (myVote === "disagree") disagree = Math.max(0, disagree - 1);

//       if (type === "agree") agree += 1;
//       if (type === "disagree") disagree += 1;

//       return { ...p, myVote: type, agreeCount: agree, disagreeCount: disagree };
//     });

//     try {
//       const data = await voteOnGist(post.id, type);
//       if (data?.post) {
//         const mapped = mapServerPostToUI(data.post);
//         setPost({ ...mapped, myVote: data.myVote ?? null });
//       } else {
//         setPost(prev);
//       }
//     } catch {
//       setPost(prev);
//     } finally {
//       setVoting(false);
//     }
//   };

//   const addComment = async () => {
//     const text = commentText.trim();
//     if (!text || !post?.id) return;

//     const optimistic = {
//       id: `tmp_${Date.now()}`,
//       name: "You",
//       badge: "You",
//       text,
//       photo: null,
//     };

//     setComments((prev) => [optimistic, ...prev]);
//     setPost((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
//     setCommentText("");

//     try {
//       await addGistComment(post.id, text);
//       await loadComments(post.id);
//     } catch (e) {
//       Alert.alert("Comment", "Could not post comment. Try again.");
//       await loadComments(post.id);
//     }
//   };

//   const onReact = (key) => {
//     setPost((prev) => {
//       if (!prev) return prev;
//       const updated = prev.reactions.map((r) =>
//         r.key === key ? { ...r, count: r.count + 1 } : r
//       );
//       return { ...prev, reactions: updated };
//     });
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.safe}>
//         <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//           <ActivityIndicator />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (!post) {
//     return (
//       <SafeAreaView style={styles.safe}>
//         <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 18 }}>
//           <Text style={{ fontWeight: "800", fontSize: 16 }}>No gist available yet.</Text>
//           <TouchableOpacity onPress={bootstrap} style={{ marginTop: 12 }}>
//             <Text style={{ color: ACCENT, fontWeight: "900" }}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const bottomPad = COMPOSER_HEIGHT + 18; // enough space under list
//   const composerBottom = kbHeight > 0 ? kbHeight : 0;
//   return (
//   <SafeAreaView style={styles.safe}>
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//       keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
//     >
//       <ScrollView
//         contentContainerStyle={[
//           styles.container,
//           { paddingBottom: bottomPad + composerBottom },
//         ]}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//         keyboardShouldPersistTaps="handled"
//         keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
//         onScrollBeginDrag={Keyboard.dismiss}
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.greeting}>Hello, {firstName}!</Text>
//           <Text style={styles.subGreeting}>The Street is live today.</Text>
//         </View>

//         {/* Countdown */}
//         <View style={styles.countdownWrap}>
//           <Ionicons name="time-outline" size={16} color="#333" />
//           <Text style={styles.countdownLabel}>Gist expires in:</Text>
//           <View style={styles.countdownPill}>
//             <Text style={styles.countdownText}>{formatCountdown(remaining)}</Text>
//           </View>
//         </View>

//         {/* Post card */}
//         <View style={styles.card}>
//           <Text style={styles.category}>{post.category}</Text>
//           <Text style={styles.title}>{post.title}</Text>

//           {!!post.image && <Image source={{ uri: post.image }} style={styles.hero} />}
//           {!!post.body && <Text style={styles.body}>{post.body}</Text>}

//           {/* <Text style={styles.take}>What’s your take?</Text> */}

//           {/* Votes */}
//           <View style={styles.voteRow}>
//             <TouchableOpacity
//               disabled={voting}
//               onPress={() => onVote("agree")}
//               style={[
//                 styles.voteBtn,
//                 post.myVote === "agree" && styles.voteBtnActive,
//                 voting && styles.disabled,
//               ]}
//             >
//                <Text
//                 style={[
//                   styles.voteText,
//                   post.myVote === "agree" && styles.voteTextActive,
//                 ]}
//               >
//                  {post.agreeCount}
//               </Text>
//               <Ionicons
//                 name={post.myVote === "agree" ? "thumbs-up" : "thumbs-up-outline"}
//                 size={24}
//                 color={post.myVote === "agree" ? "#fff" : "#111"}
//               />
              
//             </TouchableOpacity>

//             <TouchableOpacity
//               disabled={voting}
//               onPress={() => onVote("disagree")}
//               style={[
//                 styles.voteBtn,
//                 post.myVote === "disagree" && styles.voteBtnActiveGray,
//                 voting && styles.disabled,
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.voteText,
//                   post.myVote === "disagree" && styles.voteTextActive,
//                 ]}
//               >
//                 {post.disagreeCount}
//               </Text>
//               <Ionicons
//                 name={post.myVote === "disagree" ? "thumbs-down" : "thumbs-down-outline"}
//                 size={24}
//                 color={post.myVote === "disagree" ? "#fff" : "#111"}
//               />
              
//             </TouchableOpacity>
//           </View>

//           {/* Reactions (local for now) */}
         

//           {/* Comments */}
//           <View style={styles.commentsHeader}>
//             <Text style={styles.commentsTitle}>{post.commentsCount} <Ionicons name="chatbubble-ellipses-outline" size={24} color="#666" /> </Text>
            
//           </View>
//           {/* Comments */}
         

//           <View style={{ marginTop: 8 }}>
//             {comments.map((c) => (
//               <View key={c.id} style={styles.commentRow}>
//                 <View style={styles.avatar}>
//                   <Text style={styles.avatarText}>
//                     {(c.name?.[0] || "U").toUpperCase()}
//                   </Text>
//                 </View>
//                 <View style={{ flex: 1 }}>
//                   <View style={styles.commentTop}>
//                     <Text style={styles.commentName}>{c.name}</Text>
                   
//                   </View>
//                   <Text style={styles.commentText}>{c.text}</Text>
//                 </View>
//               </View>
//             ))}
//           </View>
//         </View>
//       </ScrollView>

//       {/* ✅ Composer that moves above keyboard */}
//       <View style={[styles.composer, { bottom: composerBottom }]}>
//         {/* <Ionicons name="chatbox-outline" size={18} color="#666" /> */}
//         <TextInput
//           value={commentText}
//           onChangeText={setCommentText}
//           placeholder="Share your view"
//           placeholderTextColor="#999"
//           style={styles.composerInput}
//           multiline
//           returnKeyType="send"
//         />
//         <TouchableOpacity style={styles.iconBtn}>
//           <Ionicons name="image-outline" size={20} color="#666" />
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
//           <Ionicons name="send" size={18} color="#fff" />
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   </SafeAreaView>
// );


 
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: "#fff" },
//   container: { padding: 16 },

//   header: { marginTop: 6, marginBottom: 10 },
//   greeting: { fontSize: 22, fontWeight: "900", color: "#111" },
//   subGreeting: { marginTop: 2, color: "#666" },

//   countdownWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
//   countdownLabel: { color: "#333", fontWeight: "700" },
//   countdownPill: { backgroundColor: ACCENT, paddingHorizontal: 12,  borderRadius: 12 },
//   countdownText: { color: "#fff", fontWeight: "900", letterSpacing: 0.3 },

//   card: {
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: "#eee",
//     borderRadius: 18,
//     padding: 14,
//     backgroundColor: "#fff",
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 2,
//   },

//   category: { fontSize: 14, fontWeight: "900", color: ACCENT, marginBottom: 6, letterSpacing: 0.6 },
//   title: { fontSize: 18, fontWeight: "900", color: "#111", marginBottom: 10 },

//   hero: { width: "100%", height: 190, borderRadius: 16, backgroundColor: "#f2f2f2", marginTop: 6 },
//   body: { marginTop: 10, color: "#444", lineHeight: 20 },

//   take: { marginTop: 14, color: "#666", fontWeight: "800" },

//   voteRow: { flexDirection: "row", gap: 10, marginTop: 10 },
//   voteBtn: {
//     flex: 1,
//     flexDirection: "row",
//     gap: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     borderRadius: 14,
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: "#e8e8e8",
//     backgroundColor: "#fff",
//   },
//   voteBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
//   voteBtnActiveGray: { backgroundColor: "#2f2f2f", borderColor: "#2f2f2f" },
//   voteText: { fontWeight: "900", color: "#111" },
//   voteTextActive: { color: "#fff" },
//   disabled: { opacity: 0.6 },

//   reactionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingVertical: 6 },
//   reaction: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f5f5f7" },
//   reactionEmoji: { fontSize: 16 },
//   reactionCount: { fontWeight: "900", color: "#444" },

//   commentsHeader: {
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: StyleSheet.hairlineWidth,
//     borderTopColor: "#eee",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   commentsTitle: { fontWeight: "900", color: "#111" },

//   commentRow: { flexDirection: "row", gap: 10, marginTop: 12 },
//   avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f0e7ef", alignItems: "center", justifyContent: "center" },
//   avatarText: { fontWeight: "900", color: ACCENT },

//   commentTop: { flexDirection: "row", alignItems: "center", gap: 8 },
//   commentName: { fontWeight: "900", color: "#111" },

//   badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
//   badgeVerified: { backgroundColor: "#eaf6ee" },
//   badgeMember: { backgroundColor: "#eef2ff" },
//   badgeText: { fontWeight: "900", fontSize: 11, color: "#1f7a3a" },

//   commentText: { marginTop: 2, color: "#444", lineHeight: 18 },

//   composer: {
//     position: "absolute",
//     left: 12,
//     right: 12,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: "#eee",
//     flexDirection: "row",
//     alignItems: "flex-end",
//     gap: 8,
//     shadowColor: "#000",
//     shadowOpacity: 0.06,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 8 },
//     elevation: 4,
//   },
//   composerInput: {
//     flex: 1,
//     minHeight: 40,
//     maxHeight: 90,
//     paddingHorizontal: 10,
//     paddingVertical: 9,
//     borderRadius: 12,
//     backgroundColor: "#f5f5f7",
//     color: "#111",
//   },
//   iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f5f5f7", alignItems: "center", justifyContent: "center" },
//   sendBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
// });
