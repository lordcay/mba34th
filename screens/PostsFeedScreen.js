// screens/PostsFeedScreen.js
import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
  Animated,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { socket } from '../socket';
import Colors from '../constants/Colors';
import OnboardingOverlay from '../components/OnboardingOverlay';

const FallbackImage = require('../assets/fff.jpg');

const PostsFeedScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef(null);
  
  const flatListRef = useRef(null);
  const newPostsAnimation = useRef(new Animated.Value(0)).current;

  // Fetch posts
  const fetchPosts = async (pageNum = 1, silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await postService.getFeed(pageNum, 15);
      if (result.success && result.data) {
        if (pageNum === 1) {
          setPosts(result.data);
        } else {
          setPosts(prev => [...prev, ...result.data]);
        }
        setHasMore(result.pagination?.hasMore ?? result.data.length === 15);
        setPage(pageNum);
      }
    } catch (err) {
      console.log('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPosts(1);
  }, []);

  // Search posts by keyword - with partial/fuzzy matching like LinkedIn
  const handleSearch = async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }
    
    setIsSearching(true);
    setIsSearchActive(true);
    
    try {
      // Check if searching for hashtag
      if (trimmedQuery.startsWith('#')) {
        const hashtag = trimmedQuery.slice(1).toLowerCase();
        if (hashtag) {
          console.log('Searching hashtag (partial):', hashtag);
          
          // First do local partial matching (instant results)
          const localMatches = posts.filter(post => {
            // Check if any hashtag CONTAINS the search term
            const hasMatchingHashtag = post.hashtags?.some(h => 
              h.toLowerCase().includes(hashtag)
            );
            // Also check content for hashtag mentions
            const contentHasHashtag = (post.content || '').toLowerCase().includes(`#${hashtag}`);
            return hasMatchingHashtag || contentHasHashtag;
          });
          
          // Show local results immediately
          setSearchResults(localMatches);
          
          // Then try API for more results
          try {
            const result = await postService.searchByHashtag(hashtag);
            console.log('API hashtag search result:', result);
            
            let apiResults = [];
            if (result.success && result.data) {
              apiResults = result.data;
            } else if (Array.isArray(result)) {
              apiResults = result;
            } else if (result.data && Array.isArray(result.data)) {
              apiResults = result.data;
            }
            
            // Merge local and API results, removing duplicates
            if (apiResults.length > 0) {
              const existingIds = new Set(localMatches.map(p => p._id));
              const newResults = apiResults.filter(p => !existingIds.has(p._id));
              setSearchResults([...localMatches, ...newResults]);
            }
          } catch (apiError) {
            console.log('API search failed, using local results:', apiError);
            // Already showing local results
          }
        }
      } else {
        // General search - search in content, author name, hashtags
        const lowerQuery = trimmedQuery.toLowerCase();
        const filtered = posts.filter(post => {
          const content = (post.content || '').toLowerCase();
          const authorName = `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.toLowerCase();
          const hashtags = post.hashtags?.join(' ').toLowerCase() || '';
          const comments = post.comments?.map(c => c.text || '').join(' ').toLowerCase() || '';
          
          return content.includes(lowerQuery) || 
                 authorName.includes(lowerQuery) || 
                 hashtags.includes(lowerQuery) ||
                 comments.includes(lowerQuery);
        });
        setSearchResults(filtered);
      }
    } catch (error) {
      console.log('Search error:', error);
      // Fallback to local search on error
      const lowerQuery = trimmedQuery.toLowerCase().replace('#', '');
      const filtered = posts.filter(post => {
        const content = (post.content || '').toLowerCase();
        const hashtags = post.hashtags?.join(' ').toLowerCase() || '';
        return content.includes(lowerQuery) || hashtags.includes(lowerQuery);
      });
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearchActive(false);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, posts]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
    Keyboard.dismiss();
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    const currentUserId = user?._id || user?.id;
    
    // New post created
    const handleNewPost = (data) => {
      console.log('🔔 Socket: New post received', data?.post?._id);
      if (data?.post) {
        const postAuthorId = String(data.post.author?._id || data.post.author?.id || '');
        const currentId = String(currentUserId || '');
        // If current user created the post, add directly to feed
        if (postAuthorId === currentId) {
          setPosts(prev => {
            // Check if already exists
            if (prev.some(p => p._id === data.post._id)) return prev;
            return [data.post, ...prev];
          });
          // Scroll to top
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        } else {
          // For others' posts, show the badge
          setNewPostsCount(prev => prev + 1);
          Animated.spring(newPostsAnimation, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      }
    };
    
    // Post shared/reposted
    const handlePostShared = (data) => {
      console.log('🔔 Socket: Post shared/reposted', data?.repost?._id || data?.postId);
      const reposterId = String(data?.userId || '');
      const currentId = String(currentUserId || '');
      
      // Update share count on original post
      if (data?.postId) {
        setPosts(prev => prev.map(p => 
          p._id === data.postId 
            ? { ...p, shareCount: (p.shareCount || 0) + 1 }
            : p
        ));
      }
      // If current user created the repost, add it to feed immediately
      if (data?.repost && reposterId === currentId) {
        setPosts(prev => {
          // Check if already exists
          if (prev.some(p => p._id === data.repost._id)) return prev;
          return [data.repost, ...prev];
        });
        // Scroll to top to show the new repost
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
      // Show new posts badge for other users' reposts
      else if (data?.repost && reposterId !== currentId) {
        setNewPostsCount(prev => prev + 1);
        Animated.spring(newPostsAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    };
    
    // Post reaction updated
    const handlePostReaction = (data) => {
      console.log('🔔 Socket: Post reaction', data?.postId);
      if (data?.postId && data?.post?.reactionCounts) {
        const userId = String(data?.userId || '');
        const myId = String(currentUserId || '');
        const isMyReaction = userId === myId;
        
        setPosts(prev => prev.map(p => {
          // Update the post itself if it matches
          if (p._id === data.postId) {
            return { 
              ...p, 
              reactionCounts: data.post.reactionCounts,
              // Update userReaction if it's the current user's reaction
              ...(isMyReaction && { 
                userReaction: data.type ? { type: data.type } : null 
              })
            };
          }
          // Also update reposts that contain this original post
          if (p.isRepost && p.originalPost?._id === data.postId) {
            return {
              ...p,
              originalPost: {
                ...p.originalPost,
                reactionCounts: data.post.reactionCounts,
                ...(isMyReaction && {
                  userReaction: data.type ? { type: data.type } : null
                })
              }
            };
          }
          return p;
        }));
      }
    };
    
    // New comment added
    const handleNewComment = (data) => {
      console.log('🔔 Socket: New comment', data?.postId);
      if (data?.postId && data?.post) {
        setPosts(prev => prev.map(p => 
          p._id === data.postId 
            ? { 
                ...p, 
                commentCount: data.post.commentCount || (p.commentCount || 0) + 1,
                comments: data.post.comments?.slice(-3) || p.comments
              }
            : p
        ));
      }
    };
    
    // Post deleted
    const handlePostDeleted = (data) => {
      console.log('🔔 Socket: Post deleted', data?.postId);
      if (data?.postId) {
        setPosts(prev => prev.filter(p => p._id !== data.postId));
      }
    };
    
    // Register socket listeners
    socket.on('post:created', handleNewPost);
    socket.on('post:shared', handlePostShared);
    socket.on('post:reacted', handlePostReaction);
    socket.on('post:commented', handleNewComment);
    socket.on('post:deleted', handlePostDeleted);
    
    // Cleanup
    return () => {
      socket.off('post:created', handleNewPost);
      socket.off('post:shared', handlePostShared);
      socket.off('post:reacted', handlePostReaction);
      socket.off('post:commented', handleNewComment);
      socket.off('post:deleted', handlePostDeleted);
    };
  }, [user]);

  // Load new posts when badge is tapped
  const loadNewPosts = async () => {
    setNewPostsCount(0);
    Animated.timing(newPostsAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    await fetchPosts(1, true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setNewPostsCount(0);
      fetchPosts(1, true);
    }, [])
  );

  // Handle pull to refresh
  const handleRefresh = () => {
    setNewPostsCount(0);
    Animated.timing(newPostsAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    fetchPosts(1, true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1);
    }
  };

  // Handle new post created
  const handlePostCreated = (newPost) => {
    setPosts(prev => {
      // Check if already exists (from socket)
      if (prev.some(p => p._id === newPost._id)) return prev;
      return [newPost, ...prev];
    });
    // Scroll to top to show the new post
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  // Update a post in the list
  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => 
      p._id === updatedPost._id ? updatedPost : p
    ));
  };

  // Update original post reactions (both standalone posts and within reposts)
  const handleOriginalPostUpdate = (originalPostId, newReaction, newCount) => {
    setPosts(prev => prev.map(p => {
      // Update the post itself if it matches
      if (p._id === originalPostId) {
        return {
          ...p,
          userReaction: newReaction ? { type: newReaction } : null,
          reactionCounts: { ...p.reactionCounts, total: newCount }
        };
      }
      // Update reposts that contain this original post
      if (p.isRepost && p.originalPost?._id === originalPostId) {
        return {
          ...p,
          originalPost: {
            ...p.originalPost,
            userReaction: newReaction ? { type: newReaction } : null,
            reactionCounts: { ...p.originalPost?.reactionCounts, total: newCount }
          }
        };
      }
      return p;
    }));
  };

  // Handle post deletion - remove from list
  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  // User profile image
  const userProfileImage = user?.profileImage || user?.photos?.[0];
  const formattedProfileImage = userProfileImage 
    ? (userProfileImage.startsWith('http') 
        ? userProfileImage 
        : `https://three4th-street-backend.onrender.com${userProfileImage}`)
    : null;

  // Data to display (search results or all posts)
  const displayData = isSearchActive ? searchResults : posts;

  // Render header with search and create post
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Create Post Prompt */}
      <View style={styles.createPostPrompt}>
        <Image
          source={formattedProfileImage ? { uri: formattedProfileImage } : FallbackImage}
          style={styles.promptAvatar}
        />
        <TouchableOpacity 
          style={styles.promptInput}
          onPress={() => setShowCreatePost(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.promptText}>What's on your mind?</Text>
        </TouchableOpacity>
        <View style={styles.promptActions}>
          <TouchableOpacity 
            style={styles.promptActionBtn}
            onPress={() => setShowCreatePost(true)}
          >
            <Ionicons name="image-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search active indicator */}
      {isSearchActive && searchResults.length > 0 && (
        <View style={styles.searchResultsInfo}>
          <Text style={styles.searchResultsText}>
            {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchQuery}"
          </Text>
        </View>
      )}
      
      {isSearchActive && searchResults.length === 0 && !isSearching && searchQuery && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={48} color="#ddd" />
          <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
          <Text style={styles.noResultsHint}>Try different keywords or #hashtags</Text>
        </View>
      )}
    </View>
  );

  // Render empty state
  const renderEmpty = () => {
    if (isSearchActive) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={64} color="#ddd" />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>Be the first to share something with the community!</Text>
        <TouchableOpacity 
          style={styles.emptyBtn}
          onPress={() => setShowCreatePost(true)}
        >
          <Text style={styles.emptyBtnText}>Create a Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!loadingMore || isSearchActive) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <OnboardingOverlay screenName="PostsFeed">
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Search Header */}}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search posts, #hashtags, people..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.searchLoader} />
          )}
        </View>
      </View>

      {/* New Posts Badge */}
      {newPostsCount > 0 && (
        <Animated.View 
          style={[
            styles.newPostsBadge,
            {
              transform: [{ scale: newPostsAnimation }],
              opacity: newPostsAnimation,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.newPostsBtn}
            onPress={loadNewPosts}
            activeOpacity={0.9}
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
            <Text style={styles.newPostsText}>
              {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Posts List */}
      <FlatList
        ref={flatListRef}
        data={displayData}
        keyExtractor={(item) => String(item._id)}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            navigation={navigation}
            onPostUpdate={handlePostUpdate}
            onOriginalPostUpdate={handleOriginalPostUpdate}
            onDelete={handleDeletePost}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={isSearchActive ? null : handleLoadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => setShowCreatePost(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />
    </SafeAreaView>
    </OnboardingOverlay>
  );
};

export default PostsFeedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Modern Search Header
  searchHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
    marginLeft: 4,
  },
  searchLoader: {
    marginLeft: 8,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  
  // List
  listContent: {
    paddingTop: 0,
  },
  
  // Header content wrapper
  headerContent: {
    backgroundColor: '#f5f5f5',
  },
  
  // Create post prompt
  createPostPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  promptAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f0f0',
  },
  promptInput: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  promptText: {
    fontSize: 14,
    color: '#999',
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  promptActionBtn: {
    padding: 6,
  },
  
  // Search results info
  searchResultsInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.primaryMuted,
  },
  searchResultsText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // No results
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
    textAlign: 'center',
  },
  noResultsHint: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  
  // New posts badge
  newPostsBadge: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  newPostsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 6,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  newPostsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
