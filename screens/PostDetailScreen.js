// screens/PostDetailScreen.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';
import { getConnectionStatus, getConnectionCount, getMyConnections } from '../services/connection.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FallbackImage = require('../assets/fff.jpg');

const PostDetailScreen = ({ route, navigation }) => {
  const { postId, post: initialPost, onReactionChange } = route.params || {};
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.id;
  
  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [userReaction, setUserReaction] = useState(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  
  // Reply state
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // Poll state
  const [pollVoted, setPollVoted] = useState(null);
  const [pollOptions, setPollOptions] = useState([]);
  const [votingPoll, setVotingPoll] = useState(false);
  
  // Mention autocomplete state
  const [connectionsList, setConnectionsList] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showCommentMentions, setShowCommentMentions] = useState(false);
  const [commentMentionSearch, setCommentMentionSearch] = useState('');
  const [commentMentionStartIndex, setCommentMentionStartIndex] = useState(-1);
  const [showReplyMentions, setShowReplyMentions] = useState(false);
  const [replyMentionSearch, setReplyMentionSearch] = useState('');
  const [replyMentionStartIndex, setReplyMentionStartIndex] = useState(-1);
  
  const commentInputRef = useRef(null);
  const replyInputRef = useRef(null);
  
  const author = post?.author || {};
  const authorId = author?._id || author?.id;

  useEffect(() => {
    if (!initialPost && postId) {
      fetchPost();
    } else if (initialPost) {
      setUserReaction(initialPost.userReaction?.type || null);
      setReactionCount(initialPost.reactionCounts?.total || 0);
      setComments(initialPost.comments || []);
      // Init poll state
      if (initialPost.poll?.options) {
        setPollOptions(initialPost.poll.options);
        const idx = initialPost.poll.options.findIndex(opt => opt.votes?.includes(currentUserId));
        setPollVoted(idx >= 0 ? idx : null);
      }
    }
  }, [postId, initialPost]);

  useEffect(() => {
    if (authorId && authorId !== currentUserId) {
      getConnectionCount(authorId)
        .then(count => setConnectionCount(count || 0))
        .catch(() => {});
    }
  }, [authorId, currentUserId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const result = await postService.getPost(postId);
      if (result?.data) {
        setPost(result.data);
        setUserReaction(result.data.userReaction?.type || null);
        setReactionCount(result.data.reactionCounts?.total || 0);
        setComments(result.data.comments || []);
        // Init poll state
        if (result.data.poll?.options) {
          setPollOptions(result.data.poll.options);
          const idx = result.data.poll.options.findIndex(opt => opt.votes?.includes(currentUserId));
          setPollVoted(idx >= 0 ? idx : null);
        }
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://192.168.100.28:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Poll helpers
  const getTotalVotes = () => pollOptions.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  const isPollExpired = () => post?.poll?.endsAt && new Date(post.poll.endsAt) < new Date();
  const getVotePercent = (opt) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round(((opt.votes?.length || 0) / total) * 100);
  };

  const handlePollVote = async (optionIndex) => {
    if (votingPoll || isPollExpired()) return;
    const prevVoted = pollVoted;
    const prevOptions = [...pollOptions];
    setVotingPoll(true);
    try {
      const isUnvoting = pollVoted === optionIndex;
      if (isUnvoting) {
        setPollVoted(null);
        setPollOptions(prev => prev.map((opt, i) =>
          i === optionIndex ? { ...opt, votes: (opt.votes || []).filter(v => v !== currentUserId) } : opt
        ));
      } else {
        setPollVoted(optionIndex);
        setPollOptions(prev => prev.map((opt, i) => {
          let votes = (opt.votes || []).filter(v => v !== currentUserId);
          if (i === optionIndex) votes = [...votes, currentUserId];
          return { ...opt, votes };
        }));
      }
      const result = await postService.votePoll(post._id, optionIndex);
      if (result?.data?.poll?.options) {
        setPollOptions(result.data.poll.options);
        const newIdx = result.data.poll.options.findIndex(opt => opt.votes?.includes(currentUserId));
        setPollVoted(newIdx >= 0 ? newIdx : null);
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      setPollVoted(prevVoted);
      setPollOptions(prevOptions);
    } finally {
      setVotingPoll(false);
    }
  };

  const formatPollTimeLeft = () => {
    if (!post?.poll?.endsAt) return '';
    const now = new Date();
    const end = new Date(post.poll.endsAt);
    if (end < now) return 'Poll ended';
    const diffMs = end - now;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return `${Math.floor(diffMs / 60000)}m left`;
  };

  const getDocIcon = (mimeType) => {
    if (!mimeType) return 'document-outline';
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('word') || mimeType.includes('doc')) return 'document-outline';
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'grid-outline';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel-outline';
    return 'document-outline';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
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
      const newReaction = wasReacted ? null : type;
      const newCount = wasReacted ? Math.max(0, reactionCount - 1) : reactionCount + 1;
      
      setUserReaction(newReaction);
      setReactionCount(newCount);
      
      await postService.reactToPost(post._id, type);
      
      if (onReactionChange) {
        onReactionChange(newReaction, newCount);
      }
    } catch (error) {
      console.error('Error reacting:', error);
      setUserReaction(initialPost?.userReaction?.type || null);
      setReactionCount(initialPost?.reactionCounts?.total || 0);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await postService.addComment(post._id, commentText.trim());
      setComments(result.data?.comments || result.comments || []);
      setCommentText('');
      setShowCommentMentions(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const result = await postService.likeComment(post._id, commentId);
      const updatedPost = result.data || result;
      setComments(updatedPost.comments || []);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReplyToComment = async () => {
    if (!replyText.trim() || !replyingToComment || submittingReply) return;
    
    setSubmittingReply(true);
    try {
      const result = await postService.replyToComment(post._id, replyingToComment._id, replyText.trim());
      const updatedPost = result.data || result;
      setComments(updatedPost.comments || []);
      setReplyText('');
      setReplyingToComment(null);
      setShowReplyMentions(false);
      setExpandedReplies(prev => ({ ...prev, [replyingToComment._id]: true }));
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLikeReply = async (commentId, replyIndex) => {
    try {
      const result = await postService.likeReply(post._id, commentId, replyIndex);
      const updatedPost = result.data || result;
      setComments(updatedPost.comments || []);
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Mention autocomplete
  const loadConnectionsForMention = async () => {
    if (connectionsList.length > 0 || loadingConnections) return;
    setLoadingConnections(true);
    try {
      const result = await getMyConnections();
      let list = [];
      if (result.connections && Array.isArray(result.connections)) {
        list = result.connections.map(c => ({
          ...c.user,
          _id: c.user._id || c.user.id,
          connectionId: c.connectionId
        }));
      } else if (Array.isArray(result)) {
        list = result;
      } else if (result.data && Array.isArray(result.data)) {
        list = result.data;
      }
      setConnectionsList(list);
    } catch (error) {
      console.log('Failed to load connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleCommentTextChange = (text) => {
    setCommentText(text);
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setCommentMentionSearch(textAfterAt);
          setCommentMentionStartIndex(lastAtIndex);
          if (connectionsList.length === 0) loadConnectionsForMention();
          setShowCommentMentions(true);
          return;
        }
      }
    }
    setShowCommentMentions(false);
    setCommentMentionSearch('');
    setCommentMentionStartIndex(-1);
  };

  const handleSelectCommentMention = (conn) => {
    const mentionText = `@${conn.firstName}_${conn.lastName}`;
    const before = commentText.slice(0, commentMentionStartIndex);
    setCommentText(before + mentionText + ' ');
    setShowCommentMentions(false);
    setCommentMentionSearch('');
    setCommentMentionStartIndex(-1);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleReplyTextChange = (text) => {
    setReplyText(text);
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setReplyMentionSearch(textAfterAt);
          setReplyMentionStartIndex(lastAtIndex);
          if (connectionsList.length === 0) loadConnectionsForMention();
          setShowReplyMentions(true);
          return;
        }
      }
    }
    setShowReplyMentions(false);
    setReplyMentionSearch('');
    setReplyMentionStartIndex(-1);
  };

  const handleSelectReplyMention = (conn) => {
    const mentionText = `@${conn.firstName}_${conn.lastName}`;
    const before = replyText.slice(0, replyMentionStartIndex);
    setReplyText(before + mentionText + ' ');
    setShowReplyMentions(false);
    setReplyMentionSearch('');
    setReplyMentionStartIndex(-1);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleAuthorPress = () => {
    if (authorId && authorId !== currentUserId) {
      navigation.navigate('UserProfile', { 
        user: {
          ...author,
          id: author._id || author.id,
          _id: author._id || author.id,
        }
      });
    }
  };

  const handleCommentUserPress = (commentUser) => {
    const uid = commentUser?._id || commentUser?.id;
    if (uid && uid !== currentUserId) {
      navigation.navigate('UserProfile', {
        user: { ...commentUser, id: uid, _id: uid }
      });
    }
  };

  const authorProfileImage = author?.profileImage 
    ? getImageUrl(author.profileImage)
    : (author?.photos?.[0] ? getImageUrl(author.photos[0]) : null);

  const filteredMentions = connectionsList.filter(conn => {
    if (!commentMentionSearch && !replyMentionSearch) return true;
    const search = showCommentMentions ? commentMentionSearch : replyMentionSearch;
    const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  }).slice(0, 5);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#581845" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMentionSuggestions = (isReply = false) => {
    const show = isReply ? showReplyMentions : showCommentMentions;
    if (!show || filteredMentions.length === 0) return null;
    
    return (
      <View style={styles.mentionSuggestionsContainer}>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.mentionSuggestionsList}>
          {filteredMentions.map(conn => (
            <TouchableOpacity
              key={conn._id}
              style={styles.mentionSuggestionItem}
              onPress={() => isReply ? handleSelectReplyMention(conn) : handleSelectCommentMention(conn)}
            >
              <Image
                source={conn.profileImage || conn.photos?.[0]
                  ? { uri: getImageUrl(conn.profileImage || conn.photos?.[0]) }
                  : FallbackImage
                }
                style={styles.mentionAvatar}
              />
              <Text style={styles.mentionName}>
                {conn.firstName} {conn.lastName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 32 }} />
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: replyingToComment ? 120 : 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Author Section */}
          <TouchableOpacity 
            style={styles.authorSection}
            onPress={handleAuthorPress}
            activeOpacity={authorId === currentUserId ? 1 : 0.7}
          >
            <Image
              source={authorProfileImage ? { uri: authorProfileImage } : FallbackImage}
              style={styles.authorAvatar}
            />
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>
                  {author.firstName} {author.lastName}
                </Text>
                {author.verified && (
                  <Ionicons name="checkmark-circle" size={16} color="#581845" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={styles.authorMeta}>
                {formatTimeAgo(post.createdAt)}
                {connectionCount > 0 && authorId !== currentUserId && (
                  <Text style={styles.connectionText}> · {connectionCount} connections</Text>
                )}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Post Content */}
          <Text style={styles.postContent}>{post.content}</Text>
          
          {/* Images */}
          {post.images?.length > 0 && (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesContainer}
            >
              {post.images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: getImageUrl(img) }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}
          
          {/* Poll */}
          {post.poll && (
            <View style={styles.pollContainer}>
              <Text style={styles.pollQuestion}>{post.poll.question}</Text>
              
              {pollOptions.map((option, index) => {
                const showResults = pollVoted !== null || isPollExpired();
                const isMyVote = pollVoted === index;
                const percent = getVotePercent(option);
                const expired = isPollExpired();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pollOptionBtn,
                      showResults && styles.pollOptionVoted,
                      isMyVote && styles.pollOptionMyVote,
                    ]}
                    onPress={() => handlePollVote(index)}
                    disabled={expired || votingPoll}
                    activeOpacity={0.7}
                  >
                    {showResults && (
                      <View style={[styles.pollOptionBar, { width: `${percent}%` }, isMyVote && styles.pollOptionBarMine]} />
                    )}
                    <View style={styles.pollOptionContent}>
                      <View style={styles.pollOptionLeft}>
                        {isMyVote && <Ionicons name="checkmark-circle" size={18} color="#581845" />}
                        <Text style={[styles.pollOptionText, isMyVote && styles.pollOptionTextMine]}>
                          {option.text}
                        </Text>
                      </View>
                      {showResults && (
                        <Text style={[styles.pollPercent, isMyVote && styles.pollPercentMine]}>{percent}%</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              <View style={styles.pollFooter}>
                <Text style={styles.pollVoteCount}>{getTotalVotes()} votes</Text>
                {post.poll.endsAt && (
                  <Text style={styles.pollTimeLeft}>{formatPollTimeLeft()}</Text>
                )}
              </View>
            </View>
          )}
          
          {/* Documents */}
          {post.documents?.length > 0 && (
            <View style={styles.documentsContainer}>
              {post.documents.map((doc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.documentCard}
                  onPress={() => doc.url && Linking.openURL(doc.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.docIconContainer}>
                    <Ionicons name={getDocIcon(doc.mimeType)} size={22} color="#581845" />
                  </View>
                  <View style={styles.docDetails}>
                    <Text style={styles.docFileName} numberOfLines={1}>{doc.name || 'Document'}</Text>
                    {doc.size > 0 && <Text style={styles.docFileSize}>{formatFileSize(doc.size)}</Text>}
                  </View>
                  <Ionicons name="download-outline" size={20} color="#581845" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Stats */}
          <View style={styles.statsRow}>
            {reactionCount > 0 && (
              <View style={styles.statItem}>
                <View style={[styles.miniIcon, { backgroundColor: '#581845' }]}>
                  <Ionicons name="heart" size={10} color="#fff" />
                </View>
                <Text style={styles.likeStatText}>{reactionCount}</Text>
              </View>
            )}
            {comments.length > 0 && (
              <Text style={styles.statText}>{comments.length} comments</Text>
            )}
          </View>
          
          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleReact('like')}
            >
              <Ionicons 
                name={userReaction ? 'heart' : 'heart-outline'} 
                size={22} 
                color={userReaction ? '#581845' : '#666'} 
              />
              <Text style={[styles.actionText, userReaction && { color: '#581845' }]}>Like</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => commentInputRef.current?.focus()}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#666" />
              <Text style={styles.actionText}>Comment</Text>
            </TouchableOpacity>
            
            {authorId !== currentUserId && (
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => navigation.navigate('PrivateChat', { user: author })}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#6B4C5A" />
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Comment Input */}
          <View style={styles.commentInputSection}>
            {showCommentMentions && renderMentionSuggestions(false)}
            <View style={styles.commentInputRow}>
              <Image
                source={user?.profileImage 
                  ? { uri: getImageUrl(user.profileImage) }
                  : (user?.photos?.[0] ? { uri: getImageUrl(user.photos[0]) } : FallbackImage)
                }
                style={styles.commentAvatar}
              />
              <View style={styles.commentInputWrap}>
                <TextInput
                  ref={commentInputRef}
                  value={commentText}
                  onChangeText={handleCommentTextChange}
                  placeholder="Write a comment... (use @ to mention)"
                  placeholderTextColor="#999"
                  style={styles.commentInput}
                  multiline
                />
                {commentText.trim() && (
                  <TouchableOpacity 
                    onPress={handleComment}
                    disabled={submitting}
                    style={styles.sendBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator size={16} color="#581845" />
                    ) : (
                      <Ionicons name="send" size={18} color="#581845" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          {/* Comments List */}
          <View style={styles.commentsList}>
            {comments.map((comment, index) => {
              const isLiked = comment.likes?.includes(currentUserId);
              const likeCount = comment.likes?.length || 0;
              const replyCount = comment.replies?.length || 0;
              const showReplies = expandedReplies[comment._id];
              const commentUserPhoto = comment.userId?.profileImage || comment.userId?.photos?.[0];
              
              return (
                <View key={comment._id || index} style={styles.commentItem}>
                  <TouchableOpacity onPress={() => handleCommentUserPress(comment.userId)}>
                    <Image
                      source={commentUserPhoto
                        ? { uri: getImageUrl(commentUserPhoto) }
                        : FallbackImage
                      }
                      style={styles.commentItemAvatar}
                    />
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <TouchableOpacity onPress={() => handleCommentUserPress(comment.userId)}>
                        <Text style={styles.commentAuthor}>
                          {comment.userId?.firstName} {comment.userId?.lastName}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                    
                    {/* Comment Actions */}
                    <View style={styles.commentActions}>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                      <TouchableOpacity onPress={() => handleLikeComment(comment._id)}>
                        <Text style={[
                          styles.commentActionText,
                          isLiked && styles.commentActionActive
                        ]}>
                          Like {likeCount > 0 ? `(${likeCount})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setReplyingToComment(comment)}>
                        <Text style={styles.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* View Replies Toggle */}
                    {replyCount > 0 && (
                      <TouchableOpacity 
                        style={styles.viewRepliesBtn}
                        onPress={() => toggleReplies(comment._id)}
                      >
                        <Ionicons 
                          name={showReplies ? 'chevron-up' : 'chevron-down'} 
                          size={14} 
                          color="#581845" 
                        />
                        <Text style={styles.viewRepliesText}>
                          {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Nested Replies */}
                    {showReplies && comment.replies?.map((reply, replyIndex) => {
                      const replyIsLiked = reply.likes?.includes(currentUserId);
                      const replyLikeCount = reply.likes?.length || 0;
                      const replyUserId = reply.userId?._id || reply.userId?.id;
                      const replyUserPhoto = reply.userId?.profileImage || reply.userId?.photos?.[0];
                      
                      return (
                        <View key={`reply-${replyIndex}`} style={styles.replyItem}>
                          <TouchableOpacity onPress={() => handleCommentUserPress(reply.userId)}>
                            <Image
                              source={replyUserPhoto
                                ? { uri: getImageUrl(replyUserPhoto) }
                                : FallbackImage
                              }
                              style={styles.replyAvatar}
                            />
                          </TouchableOpacity>
                          <View style={styles.replyContent}>
                            <View style={styles.replyBubble}>
                              <TouchableOpacity onPress={() => handleCommentUserPress(reply.userId)}>
                                <Text style={styles.replyAuthorName}>
                                  {reply.userId?.firstName} {reply.userId?.lastName}
                                </Text>
                              </TouchableOpacity>
                              <Text style={styles.replyText}>{reply.text}</Text>
                            </View>
                            <View style={styles.commentActions}>
                              <Text style={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</Text>
                              <TouchableOpacity onPress={() => handleLikeReply(comment._id, replyIndex)}>
                                <Text style={[
                                  styles.commentActionText,
                                  replyIsLiked && styles.commentActionActive
                                ]}>
                                  Like {replyLikeCount > 0 ? `(${replyLikeCount})` : ''}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setReplyingToComment(comment)}>
                                <Text style={styles.commentActionText}>Reply</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        
        {/* Reply Input (floating at bottom when replying) */}
        {replyingToComment && (
          <View style={styles.replyInputContainer}>
            <View style={styles.replyingToBar}>
              <Text style={styles.replyingToText}>
                Replying to {replyingToComment.userId?.firstName}
              </Text>
              <TouchableOpacity onPress={() => {
                setReplyingToComment(null);
                setReplyText('');
                setShowReplyMentions(false);
              }}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            {showReplyMentions && renderMentionSuggestions(true)}
            <View style={styles.replyInputRow}>
              <TextInput
                ref={replyInputRef}
                value={replyText}
                onChangeText={handleReplyTextChange}
                placeholder="Write a reply... (use @ to mention)"
                placeholderTextColor="#999"
                style={styles.replyInput}
                multiline
                autoFocus
              />
              <TouchableOpacity 
                onPress={handleReplyToComment}
                disabled={!replyText.trim() || submittingReply}
                style={styles.replySendBtn}
              >
                {submittingReply ? (
                  <ActivityIndicator size={16} color="#581845" />
                ) : (
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={replyText.trim() ? '#581845' : '#ccc'} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  authorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  authorMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  connectionText: {
    color: '#581845',
    fontWeight: '500',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#f0f0f0',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeStatText: {
    fontSize: 14,
    color: '#581845',
    fontWeight: '600',
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  
  // Comment Input
  commentInputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    maxHeight: 80,
  },
  sendBtn: {
    padding: 4,
    marginLeft: 8,
  },
  
  // Comments List
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginTop: 2,
  },
  commentContent: {
    marginLeft: 10,
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 10,
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
  
  // Comment Actions
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 6,
    gap: 12,
  },
  commentTime: {
    fontSize: 11,
    color: '#888',
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  commentActionActive: {
    color: '#581845',
    fontWeight: '700',
  },
  
  // View Replies
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 6,
    gap: 4,
  },
  viewRepliesText: {
    fontSize: 12,
    color: '#581845',
    fontWeight: '600',
  },
  
  // Replies
  replyItem: {
    flexDirection: 'row',
    marginTop: 10,
    paddingLeft: 4,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    marginTop: 2,
  },
  replyContent: {
    marginLeft: 8,
    flex: 1,
  },
  replyBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 8,
  },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  
  // Reply Input Container (floating)
  replyInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f5f8',
  },
  replyingToText: {
    fontSize: 13,
    color: '#581845',
    fontWeight: '500',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 80,
  },
  replySendBtn: {
    padding: 6,
  },
  
  // Mention Suggestions
  mentionSuggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    maxHeight: 180,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mentionSuggestionsList: {
    maxHeight: 180,
  },
  mentionSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  mentionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  
  // Poll styles
  pollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  pollOptionBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0d0e0',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  pollOptionVoted: {
    borderColor: '#e8dce8',
    backgroundColor: '#faf8fa',
  },
  pollOptionMyVote: {
    borderColor: '#581845',
    backgroundColor: '#faf5f9',
  },
  pollOptionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#f0e6f0',
    borderRadius: 8,
  },
  pollOptionBarMine: {
    backgroundColor: '#e8d4e5',
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 1,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pollOptionText: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  pollOptionTextMine: {
    color: '#581845',
    fontWeight: '700',
  },
  pollPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginLeft: 8,
  },
  pollPercentMine: {
    color: '#581845',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pollVoteCount: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  pollTimeLeft: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  
  // Document styles
  documentsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f4f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8dce8',
  },
  docIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0e6f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  docFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  docFileSize: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});
