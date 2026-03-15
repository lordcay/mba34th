// components/PostCard.js
import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN_H = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const FallbackImage = require('../assets/fff.jpg');

const PostCard = ({ post, navigation, onPostUpdate }) => {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.id;
  
  // Post state
  const [userReaction, setUserReaction] = useState(post?.userReaction?.type || null);
  const [reactionCount, setReactionCount] = useState(post?.reactionCounts?.total || 0);
  const [commentCount, setCommentCount] = useState(post?.commentCount || 0);
  const [shareCount, setShareCount] = useState(post?.shareCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post?.comments?.slice(0, 3) || []);
  const [submitting, setSubmitting] = useState(false);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const images = post?.images?.length > 0 ? post.images : [];
  const author = post?.author || {};
  
  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };
  
  const handleReact = async (type = 'like') => {
    try {
      const wasReacted = userReaction === type;
      
      // Optimistic update
      if (wasReacted) {
        setUserReaction(null);
        setReactionCount(prev => Math.max(0, prev - 1));
      } else {
        const hadPreviousReaction = userReaction !== null;
        setUserReaction(type);
        if (!hadPreviousReaction) {
          setReactionCount(prev => prev + 1);
        }
      }
      
      // API call
      const result = await postService.reactToPost(post._id, type);
      if (onPostUpdate) onPostUpdate(result.data);
    } catch (error) {
      console.error('Error reacting to post:', error);
      // Revert on error
      setUserReaction(post?.userReaction?.type || null);
      setReactionCount(post?.reactionCounts?.total || 0);
    }
  };
  
  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await postService.addComment(post._id, commentText.trim());
      setComments(result.data.comments.slice(-3));
      setCommentCount(result.data.commentCount);
      setCommentText('');
      if (onPostUpdate) onPostUpdate(result.data);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleShare = async () => {
    try {
      await postService.sharePost(post._id);
      setShareCount(prev => prev + 1);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };
  
  const handleAuthorPress = () => {
    if (author._id !== currentUserId) {
      navigation.navigate('UserProfile', { user: author });
    }
  };
  
  // Format image URL
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://192.168.100.4:4000${url}`;
  };
  
  // Author profile image
  const authorProfileImage = author?.profileImage 
    ? getImageUrl(author.profileImage)
    : (author?.photos?.[0] ? getImageUrl(author.photos[0]) : null);
  
  // Get reaction icon and color
  const getReactionIcon = () => {
    switch (userReaction) {
      case 'like': return { name: 'heart', color: '#e74c3c' };
      case 'love': return { name: 'heart', color: '#e74c3c' };
      case 'celebrate': return { name: 'trophy', color: '#f39c12' };
      case 'insightful': return { name: 'bulb', color: '#9b59b6' };
      case 'fire': return { name: 'flame', color: '#e67e22' };
      default: return { name: 'heart-outline', color: '#666' };
    }
  };
  
  const reactionIcon = getReactionIcon();
  
  return (
    <View style={styles.cardContainer}>
      {/* Header - Author info */}
      <TouchableOpacity style={styles.header} onPress={handleAuthorPress} activeOpacity={0.8}>
        <Image
          source={authorProfileImage ? { uri: authorProfileImage } : FallbackImage}
          style={styles.authorAvatar}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>
              {author.firstName} {author.lastName}
            </Text>
            {author.verified && (
              <Ionicons name="checkmark-circle" size={16} color="#581845" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.authorMeta}>
            {author.school || ''} • {formatTimeAgo(post.createdAt)}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* Content */}
      <View style={styles.contentWrap}>
        <Text style={styles.postContent}>{post.content}</Text>
      </View>
      
      {/* Images */}
      {images.length > 0 && (
        <View style={styles.imagesSection}>
          <Animated.FlatList
            data={images}
            keyExtractor={(_, idx) => String(idx)}
            renderItem={({ item }) => (
              <Image
                source={{ uri: getImageUrl(item) }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}
            horizontal
            pagingEnabled
            snapToInterval={CARD_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          />
          
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, i) => {
                const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View key={i} style={[styles.dot, { opacity }]} />
                );
              })}
            </View>
          )}
        </View>
      )}
      
      {/* Engagement stats */}
      {(reactionCount > 0 || commentCount > 0 || shareCount > 0) && (
        <View style={styles.statsRow}>
          {reactionCount > 0 && (
            <View style={styles.statItem}>
              <View style={styles.reactionIcons}>
                <View style={[styles.miniIcon, { backgroundColor: '#e74c3c' }]}>
                  <Ionicons name="heart" size={10} color="#fff" />
                </View>
              </View>
              <Text style={styles.statText}>{reactionCount}</Text>
            </View>
          )}
          <View style={styles.statRight}>
            {commentCount > 0 && (
              <Text style={styles.statText}>{commentCount} comments</Text>
            )}
            {shareCount > 0 && (
              <Text style={styles.statText}>{shareCount} reposts</Text>
            )}
          </View>
        </View>
      )}
      
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => handleReact('like')}
          activeOpacity={0.7}
        >
          <Ionicons name={reactionIcon.name} size={22} color={reactionIcon.color} />
          <Text style={[styles.actionText, userReaction && { color: reactionIcon.color }]}>
            Like
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => setShowComments(!showComments)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat-outline" size={22} color="#666" />
          <Text style={styles.actionText}>Repost</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => navigation.navigate('PrivateChat', { user: author })}
          activeOpacity={0.7}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#666" />
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
      </View>
      
      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {/* Comment Input */}
          <View style={styles.commentInputRow}>
            <Image
              source={user?.photos?.[0] ? { uri: getImageUrl(user.photos[0]) } : FallbackImage}
              style={styles.commentAvatar}
            />
            <View style={styles.commentInputWrap}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                style={styles.commentInput}
                multiline
              />
              {commentText.trim() && (
                <TouchableOpacity 
                  onPress={handleComment} 
                  disabled={submitting}
                  style={styles.sendCommentBtn}
                >
                  <Ionicons name="send" size={18} color={submitting ? '#ccc' : '#581845'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Recent Comments */}
          {comments.length > 0 && (
            <View style={styles.commentsList}>
              {comments.map((comment, index) => (
                <View key={comment._id || index} style={styles.commentItem}>
                  <Image
                    source={comment.userId?.profileImage 
                      ? { uri: getImageUrl(comment.userId.profileImage) }
                      : FallbackImage
                    }
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>
                      {comment.userId?.firstName} {comment.userId?.lastName}
                    </Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))}
              
              {commentCount > 3 && (
                <TouchableOpacity style={styles.viewMoreComments}>
                  <Text style={styles.viewMoreText}>View all {commentCount} comments</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* Repost indicator (if this is a repost) */}
      {post.isRepost && post.originalPost && (
        <View style={styles.repostContainer}>
          <View style={styles.repostHeader}>
            <Ionicons name="repeat" size={14} color="#666" />
            <Text style={styles.repostLabel}>Reposted</Text>
          </View>
          
          <View style={styles.originalPostCard}>
            <View style={styles.originalHeader}>
              <Image
                source={post.originalPost.author?.profileImage 
                  ? { uri: getImageUrl(post.originalPost.author.profileImage) }
                  : FallbackImage
                }
                style={styles.originalAvatar}
              />
              <View>
                <Text style={styles.originalAuthor}>
                  {post.originalPost.author?.firstName} {post.originalPost.author?.lastName}
                </Text>
                <Text style={styles.originalMeta}>
                  {formatTimeAgo(post.originalPost.createdAt)}
                </Text>
              </View>
            </View>
            <Text style={styles.originalContent} numberOfLines={3}>
              {post.originalPost.content}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default PostCard;

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    marginHorizontal: CARD_MARGIN_H,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  authorMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  moreBtn: {
    padding: 8,
  },
  
  // Content
  contentWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  
  // Images
  imagesSection: {
    position: 'relative',
  },
  postImage: {
    width: CARD_WIDTH,
    height: 280,
    backgroundColor: '#f5f5f5',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  
  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIcons: {
    flexDirection: 'row',
    marginRight: 6,
  },
  miniIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  statRight: {
    flexDirection: 'row',
    gap: 12,
  },
  
  // Action bar
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  
  // Comments section
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
    backgroundColor: '#fafafa',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    maxHeight: 80,
  },
  sendCommentBtn: {
    padding: 4,
    marginLeft: 8,
  },
  commentsList: {
    marginTop: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentBubble: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  viewMoreComments: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  viewMoreText: {
    fontSize: 13,
    color: '#581845',
    fontWeight: '600',
  },
  
  // Repost styles
  repostContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repostLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  originalPostCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  originalAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  originalMeta: {
    fontSize: 12,
    color: '#777',
  },
  originalContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
});
