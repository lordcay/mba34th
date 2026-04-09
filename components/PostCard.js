// components/PostCard.js
import React, { useState, useRef, useContext, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';
import { sendConnectionRequest, cancelConnectionRequest, getConnectionStatus, getConnectionCount, getMyConnections } from '../services/connection.service';
import { socket } from '../socket';
import Colors from '../constants/Colors';
import RichTextRenderer from './RichTextRenderer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN_H = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const FallbackImage = require('../assets/fff.jpg');

const PostCard = ({ post, navigation, onPostUpdate, onOriginalPostUpdate, onDelete }) => {
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
  
  // Original post state (for reposts)
  const [origPostReaction, setOrigPostReaction] = useState(post?.originalPost?.userReaction?.type || null);
  const [origPostReactionCount, setOrigPostReactionCount] = useState(post?.originalPost?.reactionCounts?.total || 0);
  const [submitting, setSubmitting] = useState(false);
  
  // Poll state
  const [pollVoted, setPollVoted] = useState(() => {
    if (!post?.poll?.options) return null;
    const idx = post.poll.options.findIndex(opt => opt.votes?.includes(currentUserId));
    return idx >= 0 ? idx : null;
  });
  const [pollOptions, setPollOptions] = useState(post?.poll?.options || []);
  const [votingPoll, setVotingPoll] = useState(false);
  
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionCount, setConnectionCount] = useState(0);
  const [loadingConnection, setLoadingConnection] = useState(false);
  
  // Repost modal state
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostVisibility, setRepostVisibility] = useState('public');
  const [repostCaption, setRepostCaption] = useState('');
  const [reposting, setReposting] = useState(false);
  
  // Post options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('other');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  
  // Comment options state
  const [selectedComment, setSelectedComment] = useState(null);
  const [showCommentOptionsModal, setShowCommentOptionsModal] = useState(false);
  
  // Expanded comments modal state (LinkedIn-style)
  const [showAllCommentsModal, setShowAllCommentsModal] = useState(false);
  const [allComments, setAllComments] = useState([]);
  const [loadingAllComments, setLoadingAllComments] = useState(false);
  
  // Comment reply state
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // Share to connections state
  const [showShareModal, setShowShareModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [shareMessage, setShareMessage] = useState('');
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Comment mention autocomplete state
  const [showCommentMentions, setShowCommentMentions] = useState(false);
  const [commentMentionSearch, setCommentMentionSearch] = useState('');
  const [commentMentionStartIndex, setCommentMentionStartIndex] = useState(-1);
  const [loadingCommentConnections, setLoadingCommentConnections] = useState(false);
  const commentInputRef = useRef(null);
  
  // Reply mention autocomplete state
  const [showReplyMentions, setShowReplyMentions] = useState(false);
  const [replyMentionSearch, setReplyMentionSearch] = useState('');
  const [replyMentionStartIndex, setReplyMentionStartIndex] = useState(-1);
  const replyInputRef = useRef(null);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const images = post?.images?.length > 0 ? post.images : [];
  const author = post?.author || {};
  const authorId = author?._id || author?.id;
  
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
  
  // Fetch connection status and count for author
  useEffect(() => {
    if (!authorId || authorId === currentUserId) return;
    
    const fetchConnectionData = async () => {
      try {
        const [status, count] = await Promise.all([
          getConnectionStatus(authorId),
          getConnectionCount(authorId)
        ]);
        setConnectionStatus(status || 'none');
        setConnectionCount(count || 0);
      } catch (error) {
        console.log('Error fetching connection data:', error);
      }
    };
    
    fetchConnectionData();
  }, [authorId, currentUserId]);
  
  // Socket listeners for real-time connection updates
  useEffect(() => {
    if (!authorId || !socket) return;
    
    const handleConnectionAccepted = (data) => {
      if (data.userId === authorId || data.targetUserId === authorId) {
        setConnectionStatus('connected');
        setConnectionCount(prev => prev + 1);
      }
    };
    
    const handleConnectionRemoved = (data) => {
      if (data.userId === authorId || data.targetUserId === authorId) {
        setConnectionStatus('none');
        setConnectionCount(prev => Math.max(0, prev - 1));
      }
    };
    
    socket.on('connection:accepted', handleConnectionAccepted);
    socket.on('connection:removed', handleConnectionRemoved);
    
    return () => {
      socket.off('connection:accepted', handleConnectionAccepted);
      socket.off('connection:removed', handleConnectionRemoved);
    };
  }, [authorId]);
  
  // Socket listener for original post reactions (for reposts)
  useEffect(() => {
    if (!post?.isRepost || !post?.originalPost?._id || !socket) return;
    
    const originalPostId = post.originalPost._id;
    
    const handleOriginalPostReaction = (data) => {
      if (data?.postId === originalPostId && data?.post?.reactionCounts) {
        setOrigPostReactionCount(data.post.reactionCounts.total || 0);
        // Also update userReaction if it's the current user
        if (data.userId === currentUserId) {
          setOrigPostReaction(data.type || null);
        }
      }
    };
    
    socket.on('post:reacted', handleOriginalPostReaction);
    
    return () => {
      socket.off('post:reacted', handleOriginalPostReaction);
    };
  }, [post?.isRepost, post?.originalPost?._id, currentUserId]);
  
  // Handle connect button press
  const handleConnect = async () => {
    if (!authorId || authorId === currentUserId || loadingConnection) return;
    
    const previousStatus = connectionStatus;
    setLoadingConnection(true);
    
    try {
      if (connectionStatus === 'none') {
        setConnectionStatus('pending');
        await sendConnectionRequest(authorId);
      } else if (connectionStatus === 'pending') {
        setConnectionStatus('none');
        await cancelConnectionRequest(authorId);
      }
    } catch (error) {
      setConnectionStatus(previousStatus);
      console.error('Connection action failed:', error);
      Alert.alert('Error', 'Could not complete connection action');
    } finally {
      setLoadingConnection(false);
    }
  };
  
  // Get connection display info
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'pending':
        return { icon: 'hourglass-outline', color: '#9a6b8c', label: 'Pending' };
      case 'connected':
        return { icon: 'checkmark-circle', color: '#581845', label: 'Connected' };
      default:
        return { icon: 'person-add-outline', color: '#6B4C5A', label: 'Connect' };
    }
  };
  
  const connectionDisplay = getConnectionDisplay();
  
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
      // Toggle: if tapping same option, unvote; otherwise switch vote
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
      if (onPostUpdate) onPostUpdate(result.data);
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
      setShowCommentMentions(false);
      if (onPostUpdate) onPostUpdate(result.data);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Filter connections for comment mention suggestions
  const filteredCommentConnections = connectionsList.filter(conn => {
    if (!commentMentionSearch) return true;
    const fullName = `${conn.firstName || ''} ${conn.lastName || ''}`.toLowerCase();
    return fullName.includes(commentMentionSearch.toLowerCase());
  }).slice(0, 4); // Limit to 4 suggestions
  
  // Fetch all comments for expanded view
  const fetchAllComments = async () => {
    setLoadingAllComments(true);
    try {
      const result = await postService.getPost(post._id);
      console.log('Fetched all comments:', result.data?.comments?.length);
      const postData = result.data || result;
      setAllComments(postData.comments || []);
    } catch (error) {
      console.error('Error fetching all comments:', error);
    } finally {
      setLoadingAllComments(false);
    }
  };
  
  // Open expanded comments modal
  const handleOpenAllComments = () => {
    setShowAllCommentsModal(true);
    fetchAllComments();
  };
  
  // Handle like comment
  const handleLikeComment = async (commentId) => {
    try {
      const result = await postService.likeComment(post._id, commentId);
      const updatedPost = result.data || result;
      setAllComments(updatedPost.comments || []);
      setComments(updatedPost.comments?.slice(-3) || []);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };
  
  // Handle reply to comment
  const handleReplyToComment = async () => {
    if (!replyText.trim() || !replyingToComment || submittingReply) return;
    
    setSubmittingReply(true);
    try {
      const result = await postService.replyToComment(post._id, replyingToComment._id, replyText.trim());
      const updatedPost = result.data || result;
      setAllComments(updatedPost.comments || []);
      setComments(updatedPost.comments?.slice(-3) || []);
      setCommentCount(updatedPost.commentCount || updatedPost.comments?.length || commentCount);
      setReplyText('');
      setReplyingToComment(null);
      setShowReplyMentions(false);
      // Auto-expand replies for this comment
      setExpandedReplies(prev => ({ ...prev, [replyingToComment._id]: true }));
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setSubmittingReply(false);
    }
  };
  
  // Handle like reply
  const handleLikeReply = async (commentId, replyIndex) => {
    try {
      const result = await postService.likeReply(post._id, commentId, replyIndex);
      const updatedPost = result.data || result;
      setAllComments(updatedPost.comments || []);
      setComments(updatedPost.comments?.slice(-3) || []);
    } catch (error) {
      console.error('Error liking reply:', error);
    }
  };
  
  // Toggle replies visibility
  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };
  
  // Handle comment text change to detect @ mentions - SIMPLIFIED APPROACH
  const handleCommentTextChange = (text) => {
    setCommentText(text);
    
    // Find if there's an active @ mention being typed
    // Look for @ followed by optional text at the end
    const atPattern = /@(\w*)$/;
    const match = text.match(atPattern);
    
    if (match) {
      // Found @ at end of text
      setCommentMentionSearch(match[1] || '');
      setCommentMentionStartIndex(text.length - match[0].length);
      if (connectionsList.length === 0) {
        loadConnectionsForMention();
      }
      setShowCommentMentions(true);
      return;
    }
    
    // Also check if @ is followed by text but no space after
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        // No space found after @ - user is still typing a mention
        const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setCommentMentionSearch(textAfterAt);
          setCommentMentionStartIndex(lastAtIndex);
          if (connectionsList.length === 0) {
            loadConnectionsForMention();
          }
          setShowCommentMentions(true);
          return;
        }
      }
    }
    
    setShowCommentMentions(false);
    setCommentMentionSearch('');
    setCommentMentionStartIndex(-1);
  };
  
  // Load connections for mention suggestions
  const loadConnectionsForMention = async () => {
    if (connectionsList.length > 0 || loadingCommentConnections) return;
    
    setLoadingCommentConnections(true);
    try {
      const result = await getMyConnections();
      console.log('Loaded connections for comment mentions:', result);
      
      let connectionList = [];
      
      // Handle different API response formats
      if (result.connections && Array.isArray(result.connections)) {
        // Backend returns { connections: [{ user: {...}, connectionId, connectedAt }] }
        connectionList = result.connections.map(c => ({
          ...c.user,
          _id: c.user._id || c.user.id,
          connectionId: c.connectionId
        }));
      } else if (result.success && result.data) {
        connectionList = result.data;
      } else if (Array.isArray(result)) {
        connectionList = result;
      } else if (result.data && Array.isArray(result.data)) {
        connectionList = result.data;
      }
      
      console.log('Parsed connections for comments:', connectionList.length, 'connections');
      setConnectionsList(connectionList);
    } catch (error) {
      console.log('Failed to load connections for mentions:', error);
    } finally {
      setLoadingCommentConnections(false);
    }
  };
  
  // Insert selected mention into comment
  const handleSelectCommentMention = (connection) => {
    const mentionText = `@${connection.firstName}_${connection.lastName}`;
    const beforeMention = commentText.slice(0, commentMentionStartIndex);
    
    const newText = beforeMention + mentionText + ' ';
    setCommentText(newText);
    setShowCommentMentions(false);
    setCommentMentionSearch('');
    setCommentMentionStartIndex(-1);
    
    // Focus back on input
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  // Handle reply text change with @ mention detection
  const handleReplyTextChange = (text) => {
    setReplyText(text);
    
    // Find if there's an active @ mention being typed
    const atPattern = /@(\w*)$/;
    const match = text.match(atPattern);
    
    if (match) {
      setReplyMentionSearch(match[1] || '');
      setReplyMentionStartIndex(text.length - match[0].length);
      if (connectionsList.length === 0) {
        loadConnectionsForMention();
      }
      setShowReplyMentions(true);
      return;
    }
    
    // Check if @ is followed by text but no space after
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setReplyMentionSearch(textAfterAt);
          setReplyMentionStartIndex(lastAtIndex);
          if (connectionsList.length === 0) {
            loadConnectionsForMention();
          }
          setShowReplyMentions(true);
          return;
        }
      }
    }
    
    setShowReplyMentions(false);
    setReplyMentionSearch('');
    setReplyMentionStartIndex(-1);
  };

  // Insert selected mention into reply
  const handleSelectReplyMention = (connection) => {
    const mentionText = `@${connection.firstName}_${connection.lastName}`;
    const beforeMention = replyText.slice(0, replyMentionStartIndex);
    
    const newText = beforeMention + mentionText + ' ';
    setReplyText(newText);
    setShowReplyMentions(false);
    setReplyMentionSearch('');
    setReplyMentionStartIndex(-1);
    
    // Focus back on input
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleShare = () => {
    // Open the repost modal
    setShowRepostModal(true);
  };
  
  const handleRepost = async () => {
    if (reposting) return;
    
    setReposting(true);
    try {
      const result = await postService.sharePost(post._id, repostCaption || null, repostVisibility);
      setShareCount(prev => prev + 1);
      setShowRepostModal(false);
      setRepostCaption('');
      setRepostVisibility('public');
      
      // Show subtle success feedback
      Alert.alert(
        '✓ Reposted!', 
        `Shared to ${repostVisibility === 'public' ? 'everyone' : 'your connections'}`,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error sharing post:', error?.response?.data || error?.message);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || 'Could not share this post right now';
      Alert.alert('Repost Failed', errMsg);
    } finally {
      setReposting(false);
    }
  };
  
  const closeRepostModal = () => {
    setShowRepostModal(false);
    setRepostCaption('');
    setRepostVisibility('public');
  };
  
  const handleAuthorPress = () => {
    const authorIdToCheck = author._id || author.id;
    if (authorIdToCheck && authorIdToCheck !== currentUserId) {
      // Pass author with both id and _id for compatibility
      navigation.navigate('UserProfile', { 
        user: {
          ...author,
          id: author._id || author.id,
          _id: author._id || author.id,
        }
      });
    }
  };
  
  // Format image URL
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://192.168.100.28:4000${url}`;
  };
  
  // Author profile image
  const authorProfileImage = author?.profileImage 
    ? getImageUrl(author.profileImage)
    : (author?.photos?.[0] ? getImageUrl(author.photos[0]) : null);
  
  // Get reaction icon and color
  const getReactionIcon = () => {
    switch (userReaction) {
      case 'like': return { name: 'heart', color: '#581845' };
      case 'love': return { name: 'heart', color: '#581845' };
      case 'celebrate': return { name: 'trophy', color: '#f39c12' };
      case 'insightful': return { name: 'bulb', color: '#9b59b6' };
      case 'fire': return { name: 'flame', color: '#e67e22' };
      default: return { name: 'heart-outline', color: '#666' };
    }
  };
  
  const reactionIcon = getReactionIcon();
  
  // Check if current user is the post author
  const isOwnPost = authorId === currentUserId;
  
  // Delete post handler
  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await postService.deletePost(post._id);
              Alert.alert('Success', 'Post deleted successfully');
              setShowOptionsModal(false);
              // Trigger refresh or remove from list via callback
              if (onDelete) onDelete(post._id);
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to delete post');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  // Report post handler
  const handleReportPost = async () => {
    if (!reportCategory) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }
    
    setIsReporting(true);
    try {
      await postService.reportPost(post._id, reportCategory, reportReason);
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe. We will review this post.');
      setShowReportModal(false);
      setShowOptionsModal(false);
      setReportCategory('other');
      setReportReason('');
    } catch (error) {
      console.error('Error reporting post:', error);
      const errMsg = error?.response?.data?.message || 'Failed to submit report';
      Alert.alert('Error', errMsg);
    } finally {
      setIsReporting(false);
    }
  };
  
  // Delete comment handler
  const handleDeleteComment = (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await postService.deleteComment(post._id, commentId);
              setComments(prev => prev.filter(c => c._id !== commentId));
              setCommentCount(prev => Math.max(0, prev - 1));
              Alert.alert('Success', 'Comment deleted');
              setShowCommentOptionsModal(false);
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };
  
  // Report comment handler  
  const handleReportComment = async () => {
    if (!selectedComment) return;
    
    setIsReporting(true);
    try {
      await postService.reportComment(post._id, selectedComment._id, reportCategory, reportReason);
      Alert.alert('Report Submitted', 'Thank you for reporting this comment. We will review it.');
      setShowCommentOptionsModal(false);
      setSelectedComment(null);
      setReportCategory('other');
      setReportReason('');
    } catch (error) {
      console.error('Error reporting comment:', error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };
  
  // Report reasons
  const reportCategories = [
    { id: 'spam', label: 'Spam', icon: 'alert-circle' },
    { id: 'harassment', label: 'Harassment or Bullying', icon: 'hand-left' },
    { id: 'hate_speech', label: 'Hate Speech', icon: 'warning' },
    { id: 'violence', label: 'Violence or Threats', icon: 'alert' },
    { id: 'nudity', label: 'Nudity or Sexual Content', icon: 'eye-off' },
    { id: 'false_information', label: 'False Information', icon: 'information-circle' },
    { id: 'scam', label: 'Scam or Fraud', icon: 'cash' },
    { id: 'self_harm', label: 'Self-Harm', icon: 'heart-dislike' },
    { id: 'intellectual_property', label: 'Intellectual Property', icon: 'document' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ];
  
  // Load connections for share modal
  const loadConnections = async () => {
    setLoadingConnections(true);
    try {
      const connections = await getMyConnections();
      setConnectionsList(Array.isArray(connections) ? connections : []);
    } catch (error) {
      console.error('Error loading connections:', error);
      setConnectionsList([]);
    } finally {
      setLoadingConnections(false);
    }
  };
  
  // Open share modal
  const handleOpenShareModal = () => {
    setShowOptionsModal(false);
    setSelectedConnections([]);
    setShareMessage('');
    setTimeout(() => {
      setShowShareModal(true);
      loadConnections();
    }, 300);
  };
  
  // Toggle connection selection
  const toggleConnectionSelection = (connectionId) => {
    setSelectedConnections(prev => {
      if (prev.includes(connectionId)) {
        return prev.filter(id => id !== connectionId);
      } else {
        return [...prev, connectionId];
      }
    });
  };
  
  // Select/deselect all connections
  const toggleSelectAll = () => {
    if (selectedConnections.length === connectionsList.length) {
      setSelectedConnections([]);
    } else {
      setSelectedConnections(connectionsList.map(c => c._id || c.id));
    }
  };
  
  // Share to selected connections
  const handleShareToConnections = async () => {
    if (selectedConnections.length === 0) {
      Alert.alert('Select Connections', 'Please select at least one connection to share with');
      return;
    }
    
    setIsSharing(true);
    try {
      const result = await postService.shareToConnections(post._id, selectedConnections, shareMessage);
      Alert.alert(
        '✓ Shared!',
        result.message || `Post shared with ${selectedConnections.length} connection${selectedConnections.length > 1 ? 's' : ''}`,
        [{ text: 'OK', style: 'default' }]
      );
      setShowShareModal(false);
      setSelectedConnections([]);
      setShareMessage('');
    } catch (error) {
      console.error('Error sharing to connections:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to share post');
    } finally {
      setIsSharing(false);
    }
  };
  
  // Get image URL for connections
  const getConnectionImage = (connection) => {
    const img = connection?.profileImage || connection?.photos?.[0];
    if (!img) return null;
    return img.startsWith('http') ? img : `http://192.168.100.28:4000${img}`;
  };

  return (
    <View style={[styles.cardContainer, post.isRepost && styles.repostCardContainer]}>
      {/* Subtle Repost Indicator at top */}
      {post.isRepost && (
        <View style={styles.repostIndicator}>
          <Ionicons name="repeat" size={12} color="#581845" />
          <Text style={styles.repostIndicatorText}>
            {author?.firstName || 'Someone'} reposted
          </Text>
        </View>
      )}
      
      {/* Header - Author info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.8} style={styles.headerLeft}>
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
            <View style={styles.metaRow}>
              <Text style={styles.authorMeta}>
                {author.school || ''} • {formatTimeAgo(post.createdAt)}
              </Text>
              {connectionCount > 0 && (
                <View style={styles.connectionBadge}>
                  <Ionicons name="people" size={12} color="#581845" />
                  <Text style={styles.connectionCountText}>{connectionCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Connect Button - Only show if not own post */}
        <View style={styles.headerActions}>
          {authorId !== currentUserId && (
            <TouchableOpacity 
              style={[
                styles.connectBtn,
                connectionStatus === 'connected' && styles.connectedBtn,
                connectionStatus === 'pending' && styles.pendingBtn,
              ]}
              onPress={handleConnect}
              disabled={loadingConnection || connectionStatus === 'connected'}
              activeOpacity={0.7}
            >
              {loadingConnection ? (
                <ActivityIndicator size={14} color="#581845" />
              ) : (
                <Ionicons 
                  name={connectionDisplay.icon} 
                  size={18} 
                  color={connectionDisplay.color} 
                />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowOptionsModal(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content */}
      <View style={styles.contentWrap}>
        <RichTextRenderer 
          text={post.content}
          style={styles.postContent}
          mentionedUsers={post.mentions || []}
          onHashtagPress={(hashtag) => {
            // Navigate to search with hashtag
            navigation.navigate('PostsFeed', { searchQuery: `#${hashtag}` });
          }}
          onMentionPress={(mention) => {
            // Navigate to user profile if user exists
            if (mention.user) {
              navigation.navigate('UserProfile', { 
                user: {
                  ...mention.user,
                  _id: mention.user.userId || mention.user._id || mention.user.id,
                }
              });
            }
          }}
        />
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
      
      {/* Poll */}
      {post?.poll && (
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
      {post?.documents?.length > 0 && (
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
      
      {/* Engagement stats */}
      {(reactionCount > 0 || commentCount > 0 || shareCount > 0) && (
        <View style={styles.statsRow}>
          {reactionCount > 0 && (
            <View style={styles.statItem}>
              <View style={styles.reactionIcons}>
                <View style={[styles.miniIcon, { backgroundColor: '#581845' }]}>
                  <Ionicons name="heart" size={10} color="#fff" />
                </View>
              </View>
              <Text style={styles.likeStatText}>{reactionCount}</Text>
            </View>
          )}
          <View style={styles.statRight}>
            {commentCount > 0 && (
              <TouchableOpacity onPress={handleOpenAllComments}>
                <Text style={styles.statText}>{commentCount} comments</Text>
              </TouchableOpacity>
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
          onPress={() => {
            setShowComments(!showComments);
            // Preload connections for @ mentions when opening comments
            if (!showComments && connectionsList.length === 0) {
              loadConnectionsForMention();
            }
          }}
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
        
        {/* Only show Message button for other users' posts */}
        {authorId && authorId !== currentUserId && (
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => navigation.navigate('PrivateChat', { user: author })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#6B4C5A" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
        )}
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
            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputWrap}>
                <TextInput
                  ref={commentInputRef}
                  value={commentText}
                  onChangeText={handleCommentTextChange}
                  placeholder="Write a comment... Use @ to mention"
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
                    <Ionicons name="send" size={18} color={submitting ? '#ccc' : Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          {/* Mention suggestions for comments - appears above comments list */}
          {showCommentMentions && (
            <View style={styles.commentMentionSuggestions}>
              {loadingCommentConnections ? (
                <View style={styles.commentMentionLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.commentMentionLoadingText}>Loading...</Text>
                </View>
              ) : connectionsList.length === 0 ? (
                <View style={styles.commentMentionEmpty}>
                  <Text style={styles.commentMentionEmptyText}>No connections</Text>
                </View>
              ) : filteredCommentConnections.length === 0 ? (
                <View style={styles.commentMentionEmpty}>
                  <Text style={styles.commentMentionEmptyText}>No matches</Text>
                </View>
              ) : (
                filteredCommentConnections.map((conn) => (
                  <TouchableOpacity 
                    key={conn._id || conn.id || String(Math.random())}
                    style={styles.commentMentionItem}
                    onPress={() => handleSelectCommentMention(conn)}
                  >
                    <Image
                      source={conn.photos?.[0] ? { uri: conn.photos[0] } : FallbackImage}
                      style={styles.commentMentionAvatar}
                    />
                    <Text style={styles.commentMentionName}>
                      {conn.firstName} {conn.lastName}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          
          {/* Recent Comments */}
          {comments.length > 0 && (
            <View style={styles.commentsList}>
              {comments.map((comment, index) => {
                const isLiked = comment.likes?.includes(currentUserId);
                const likeCount = comment.likes?.length || 0;
                const replyCount = comment.replies?.length || 0;
                const showReplies = expandedReplies[comment._id];
                
                return (
                  <View key={comment._id || index} style={styles.inlineCommentItem}>
                    <TouchableOpacity
                      onPress={() => {
                        const commentUserId = comment.userId?._id || comment.userId?.id;
                        if (commentUserId && commentUserId !== currentUserId) {
                          navigation.navigate('UserProfile', { 
                            user: {
                              ...comment.userId,
                              id: commentUserId,
                              _id: commentUserId,
                            }
                          });
                        }
                      }}
                    >
                      <Image
                        source={(comment.userId?.profileImage || comment.userId?.photos?.[0])
                          ? { uri: getImageUrl(comment.userId?.profileImage || comment.userId?.photos?.[0]) }
                          : FallbackImage
                        }
                        style={styles.commentAvatar}
                      />
                    </TouchableOpacity>
                    <View style={styles.inlineCommentContent}>
                      <Pressable 
                        style={styles.commentBubble}
                        onLongPress={() => {
                          setSelectedComment(comment);
                          setShowCommentOptionsModal(true);
                        }}
                        delayLongPress={400}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            const commentUserId = comment.userId?._id || comment.userId?.id;
                            if (commentUserId && commentUserId !== currentUserId) {
                              navigation.navigate('UserProfile', { 
                                user: {
                                  ...comment.userId,
                                  id: commentUserId,
                                  _id: commentUserId,
                                }
                              });
                            }
                          }}
                        >
                          <Text style={styles.commentAuthor}>
                            {comment.userId?.firstName} {comment.userId?.lastName}
                          </Text>
                        </TouchableOpacity>
                        <RichTextRenderer 
                          text={comment.text}
                          style={styles.commentText}
                          onHashtagPress={(hashtag) => {
                            navigation.navigate('PostsFeed', { searchQuery: `#${hashtag}` });
                          }}
                        />
                      </Pressable>
                      
                      {/* Like & Reply Actions */}
                      <View style={styles.inlineCommentActions}>
                        <Text style={styles.inlineCommentTime}>
                          {formatTimeAgo(comment.createdAt)}
                        </Text>
                        <TouchableOpacity 
                          style={styles.inlineActionBtn}
                          onPress={() => handleLikeComment(comment._id)}
                        >
                          <Text style={[
                            styles.inlineActionText,
                            isLiked && styles.inlineActionTextActive
                          ]}>
                            Like {likeCount > 0 ? `(${likeCount})` : ''}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.inlineActionBtn}
                          onPress={() => {
                            setReplyingToComment(comment);
                            setTimeout(() => replyInputRef.current?.focus(), 100);
                          }}
                        >
                          <Text style={styles.inlineActionText}>Reply</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.commentOptionsBtn}
                          onPress={() => {
                            setSelectedComment(comment);
                            setShowCommentOptionsModal(true);
                          }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={14} color="#999" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Show Replies Toggle */}
                      {replyCount > 0 && (
                        <TouchableOpacity 
                          style={styles.inlineViewRepliesBtn}
                          onPress={() => toggleReplies(comment._id)}
                        >
                          <Ionicons 
                            name={showReplies ? 'chevron-up' : 'chevron-down'} 
                            size={13} 
                            color="#581845" 
                          />
                          <Text style={styles.inlineViewRepliesText}>
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
                          <View key={`reply-${replyIndex}`} style={styles.inlineReplyItem}>
                            <TouchableOpacity
                              onPress={() => {
                                if (replyUserId && replyUserId !== currentUserId) {
                                  navigation.navigate('UserProfile', { 
                                    user: {
                                      ...reply.userId,
                                      id: replyUserId,
                                      _id: replyUserId,
                                    }
                                  });
                                }
                              }}
                            >
                              <Image
                                source={replyUserPhoto
                                  ? { uri: getImageUrl(replyUserPhoto) }
                                  : FallbackImage
                                }
                                style={styles.inlineReplyAvatar}
                              />
                            </TouchableOpacity>
                            <View style={styles.inlineReplyContent}>
                              <View style={styles.inlineReplyBubble}>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (replyUserId && replyUserId !== currentUserId) {
                                      navigation.navigate('UserProfile', { 
                                        user: {
                                          ...reply.userId,
                                          id: replyUserId,
                                          _id: replyUserId,
                                        }
                                      });
                                    }
                                  }}
                                >
                                  <Text style={styles.inlineReplyAuthor}>
                                    {reply.userId?.firstName} {reply.userId?.lastName}
                                  </Text>
                                </TouchableOpacity>
                                <Text style={styles.inlineReplyText}>{reply.text}</Text>
                              </View>
                              <View style={styles.inlineReplyActions}>
                                <Text style={styles.inlineCommentTime}>
                                  {formatTimeAgo(reply.createdAt)}
                                </Text>
                                <TouchableOpacity 
                                  onPress={() => handleLikeReply(comment._id, replyIndex)}
                                >
                                  <Text style={[
                                    styles.inlineActionText,
                                    replyIsLiked && styles.inlineActionTextActive
                                  ]}>
                                    Like {replyLikeCount > 0 ? `(${replyLikeCount})` : ''}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => {
                                    setReplyingToComment(comment);
                                    setTimeout(() => replyInputRef.current?.focus(), 100);
                                  }}
                                >
                                  <Text style={styles.inlineActionText}>Reply</Text>
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
              
              {commentCount > 3 && (
                <TouchableOpacity 
                  style={styles.viewMoreComments}
                  onPress={handleOpenAllComments}
                >
                  <Text style={styles.viewMoreText}>View all {commentCount} comments</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Inline Reply Input */}
          {replyingToComment && !showAllCommentsModal && (
            <View style={styles.inlineReplyInputContainer}>
              <View style={styles.inlineReplyingToBar}>
                <Text style={styles.inlineReplyingToText}>
                  Replying to {replyingToComment.userId?.firstName}
                </Text>
                <TouchableOpacity onPress={() => {
                  setReplyingToComment(null);
                  setReplyText('');
                  setShowReplyMentions(false);
                }}>
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              
              {/* Reply Mention Suggestions */}
              {showReplyMentions && connectionsList.length > 0 && (
                <View style={styles.inlineMentionSuggestions}>
                  <ScrollView 
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 150 }}
                  >
                    {connectionsList
                      .filter(conn => {
                        if (!replyMentionSearch) return true;
                        const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase();
                        return fullName.includes(replyMentionSearch.toLowerCase());
                      })
                      .slice(0, 5)
                      .map(conn => (
                        <TouchableOpacity
                          key={conn._id}
                          style={styles.commentMentionItem}
                          onPress={() => handleSelectReplyMention(conn)}
                        >
                          <Image
                            source={conn.profileImage || conn.photos?.[0]
                              ? { uri: getImageUrl(conn.profileImage || conn.photos?.[0]) }
                              : FallbackImage
                            }
                            style={styles.commentMentionAvatar}
                          />
                          <Text style={styles.commentMentionName}>
                            {conn.firstName} {conn.lastName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
              
              <View style={styles.inlineReplyInputRow}>
                <TextInput
                  ref={replyInputRef}
                  value={replyText}
                  onChangeText={handleReplyTextChange}
                  placeholder="Write a reply... (use @ to mention)"
                  placeholderTextColor="#999"
                  style={styles.inlineReplyInput}
                  multiline
                />
                <TouchableOpacity 
                  onPress={handleReplyToComment}
                  disabled={!replyText.trim() || submittingReply}
                  style={styles.inlineReplySendBtn}
                >
                  {submittingReply ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={18} 
                      color={replyText.trim() ? Colors.primary : '#ccc'} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
      
      {/* Repost indicator (if this is a repost) */}
      {post.isRepost && post.originalPost && (
        <View style={styles.repostContainer}>
          <View style={styles.repostHeader}>
            <Ionicons name="document-text-outline" size={14} color="#581845" />
            <Text style={styles.repostLabel}>Original post</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.originalPostCard}
            onPress={() => {
              // Navigate to PostDetail with callback for syncing reactions
              navigation.navigate('PostDetail', { 
                postId: post.originalPost._id, 
                post: {
                  ...post.originalPost,
                  userReaction: origPostReaction ? { type: origPostReaction } : null,
                  reactionCounts: { total: origPostReactionCount },
                },
                onReactionChange: (newReaction, newCount) => {
                  setOrigPostReaction(newReaction);
                  setOrigPostReactionCount(newCount);
                  // Also notify parent for global sync
                  if (onOriginalPostUpdate) {
                    onOriginalPostUpdate(post.originalPost._id, newReaction, newCount);
                  }
                }
              });
            }}
            activeOpacity={0.8}
          >
            <TouchableOpacity 
              style={styles.originalHeader}
              onPress={() => {
                const origAuthorId = post.originalPost.author?._id || post.originalPost.author?.id;
                if (origAuthorId && origAuthorId !== currentUserId) {
                  navigation.navigate('UserProfile', { 
                    user: {
                      ...post.originalPost.author,
                      id: origAuthorId,
                      _id: origAuthorId,
                    }
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Image
                source={post.originalPost.author?.profileImage 
                  ? { uri: getImageUrl(post.originalPost.author.profileImage) }
                  : (post.originalPost.author?.photos?.[0]
                      ? { uri: getImageUrl(post.originalPost.author.photos[0]) }
                      : FallbackImage)
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
            </TouchableOpacity>
            <RichTextRenderer 
              text={post.originalPost.content}
              style={styles.originalContent}
              numberOfLines={3}
              mentionedUsers={post.originalPost.mentions || []}
              onHashtagPress={(hashtag) => {
                navigation.navigate('PostsFeed', { searchQuery: `#${hashtag}` });
              }}
            />
            
            {/* Original post engagement row */}
            <View style={styles.originalEngagementRow}>
              <TouchableOpacity 
                style={styles.originalLikeBtn}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    const wasReacted = origPostReaction === 'like';
                    // Optimistic update
                    setOrigPostReaction(wasReacted ? null : 'like');
                    setOrigPostReactionCount(prev => wasReacted ? Math.max(0, prev - 1) : prev + 1);
                    
                    // API call to original post
                    await postService.reactToPost(post.originalPost._id, 'like');
                    
                    // Notify parent for global sync
                    if (onOriginalPostUpdate) {
                      onOriginalPostUpdate(
                        post.originalPost._id, 
                        wasReacted ? null : 'like', 
                        wasReacted ? Math.max(0, origPostReactionCount - 1) : origPostReactionCount + 1
                      );
                    }
                  } catch (error) {
                    console.error('Error reacting to original post:', error);
                    // Revert on error
                    setOrigPostReaction(post?.originalPost?.userReaction?.type || null);
                    setOrigPostReactionCount(post?.originalPost?.reactionCounts?.total || 0);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={origPostReaction ? 'heart' : 'heart-outline'} 
                  size={16} 
                  color={origPostReaction ? '#581845' : '#666'} 
                />
                {origPostReactionCount > 0 && (
                  <Text style={[styles.originalLikeCount, origPostReaction && { color: '#581845' }]}>
                    {origPostReactionCount}
                  </Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.viewOriginalRow}>
                <Text style={styles.viewOriginalText}>View full post</Text>
                <Ionicons name="chevron-forward" size={14} color="#581845" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Repost Modal */}
      <Modal
        visible={showRepostModal}
        transparent
        animationType="slide"
        onRequestClose={closeRepostModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeRepostModal} />
          <View style={styles.repostModalContainer}>
            {/* Modal Header */}
            <View style={styles.repostModalHeader}>
              <Text style={styles.repostModalTitle}>Repost</Text>
              <TouchableOpacity onPress={closeRepostModal} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Visibility Options */}
            <Text style={styles.visibilityLabel}>Who can see this repost?</Text>
            <View style={styles.visibilityOptions}>
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  repostVisibility === 'public' && styles.visibilityOptionSelected
                ]}
                onPress={() => setRepostVisibility('public')}
              >
                <View style={[
                  styles.visibilityIconWrap,
                  repostVisibility === 'public' && styles.visibilityIconSelected
                ]}>
                  <Ionicons 
                    name="globe-outline" 
                    size={24} 
                    color={repostVisibility === 'public' ? '#fff' : '#581845'} 
                  />
                </View>
                <View style={styles.visibilityTextWrap}>
                  <Text style={[
                    styles.visibilityTitle,
                    repostVisibility === 'public' && styles.visibilityTitleSelected
                  ]}>Public</Text>
                  <Text style={styles.visibilityDesc}>Everyone can see this</Text>
                </View>
                {repostVisibility === 'public' && (
                  <Ionicons name="checkmark-circle" size={22} color="#581845" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  repostVisibility === 'connections' && styles.visibilityOptionSelected
                ]}
                onPress={() => setRepostVisibility('connections')}
              >
                <View style={[
                  styles.visibilityIconWrap,
                  repostVisibility === 'connections' && styles.visibilityIconSelected
                ]}>
                  <Ionicons 
                    name="people-outline" 
                    size={24} 
                    color={repostVisibility === 'connections' ? '#fff' : '#581845'} 
                  />
                </View>
                <View style={styles.visibilityTextWrap}>
                  <Text style={[
                    styles.visibilityTitle,
                    repostVisibility === 'connections' && styles.visibilityTitleSelected
                  ]}>Connections</Text>
                  <Text style={styles.visibilityDesc}>Only your connections</Text>
                </View>
                {repostVisibility === 'connections' && (
                  <Ionicons name="checkmark-circle" size={22} color="#581845" />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Caption Input */}
            <Text style={styles.captionLabel}>Add a caption (optional)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Say something about this post..."
              placeholderTextColor="#999"
              value={repostCaption}
              onChangeText={setRepostCaption}
              multiline
              maxLength={500}
            />
            
            {/* Preview of original post */}
            <View style={styles.repostPreview}>
              <View style={styles.previewHeader}>
                <Image
                  source={author?.profileImage ? { uri: getImageUrl(author.profileImage) } : FallbackImage}
                  style={styles.previewAvatar}
                />
                <View>
                  <Text style={styles.previewAuthor}>{author.firstName} {author.lastName}</Text>
                  <Text style={styles.previewMeta}>{formatTimeAgo(post.createdAt)}</Text>
                </View>
              </View>
              <RichTextRenderer 
                text={post.content}
                style={styles.previewContent}
                numberOfLines={2}
                mentionedUsers={post.mentions || []}
              />
            </View>
            
            {/* Repost Button */}
            <TouchableOpacity
              style={[styles.repostBtn, reposting && styles.repostBtnDisabled]}
              onPress={handleRepost}
              disabled={reposting}
            >
              {reposting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="repeat" size={20} color="#fff" />
                  <Text style={styles.repostBtnText}>Repost</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Post Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable 
          style={styles.optionsOverlay} 
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Post Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {isOwnPost ? (
              // Own post options
              <TouchableOpacity 
                style={styles.optionItem} 
                onPress={handleDeletePost}
                disabled={isDeleting}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="trash-outline" size={22} color="#dc2626" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, { color: '#dc2626' }]}>Delete Post</Text>
                  <Text style={styles.optionDesc}>Permanently remove this post</Text>
                </View>
                {isDeleting && <ActivityIndicator size="small" color="#dc2626" />}
              </TouchableOpacity>
            ) : (
              // Other user's post options
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsModal(false);
                  setTimeout(() => setShowReportModal(true), 300);
                }}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="flag-outline" size={22} color="#d97706" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Report Post</Text>
                  <Text style={styles.optionDesc}>Report this post for review</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Share to Connections option */}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleOpenShareModal}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: Colors.primaryMuted }]}>
                <Ionicons name="paper-plane-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionLabel}>Share to Connections</Text>
                <Text style={styles.optionDesc}>Send this post to your connections</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowOptionsModal(false)}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#f3f4f6' }]}>
                <Ionicons name="close-outline" size={22} color="#6b7280" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionLabel}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      {/* Report Post Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportContainer}>
            <View style={styles.reportHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.reportTitle}>Report Post</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <Text style={styles.reportSubtitle}>Why are you reporting this post?</Text>
            
            <ScrollView style={styles.reportCategoriesScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.reportCategoriesList}>
                {reportCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.reportCategoryItem,
                      reportCategory === cat.id && styles.reportCategorySelected
                    ]}
                    onPress={() => setReportCategory(cat.id)}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={20} 
                      color={reportCategory === cat.id ? Colors.primary : '#666'} 
                    />
                    <Text style={[
                      styles.reportCategoryLabel,
                      reportCategory === cat.id && styles.reportCategoryLabelSelected
                    ]}>
                      {cat.label}
                    </Text>
                    {reportCategory === cat.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <TextInput
              style={styles.reportReasonInput}
              placeholder="Additional details (optional)"
              placeholderTextColor="#999"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.reportSubmitBtn, isReporting && styles.reportSubmitBtnDisabled]}
              onPress={handleReportPost}
              disabled={isReporting}
            >
              {isReporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.reportSubmitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Comment Options Modal */}
      <Modal
        visible={showCommentOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCommentOptionsModal(false);
          setSelectedComment(null);
        }}
      >
        <Pressable 
          style={styles.optionsOverlay} 
          onPress={() => {
            setShowCommentOptionsModal(false);
            setSelectedComment(null);
          }}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Comment Options</Text>
              <TouchableOpacity onPress={() => {
                setShowCommentOptionsModal(false);
                setSelectedComment(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedComment && (selectedComment.userId?._id === currentUserId || selectedComment.userId?.id === currentUserId) ? (
              // Own comment - show delete
              <TouchableOpacity 
                style={styles.optionItem} 
                onPress={() => handleDeleteComment(selectedComment._id)}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="trash-outline" size={22} color="#dc2626" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, { color: '#dc2626' }]}>Delete Comment</Text>
                  <Text style={styles.optionDesc}>Remove this comment</Text>
                </View>
              </TouchableOpacity>
            ) : (
              // Other's comment - show report
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                  setShowCommentOptionsModal(false);
                  setTimeout(() => {
                    setReportCategory('other');
                    setReportReason('');
                    Alert.alert(
                      'Report Comment',
                      'Would you like to report this comment?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Report', onPress: handleReportComment }
                      ]
                    );
                  }, 300);
                }}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="flag-outline" size={22} color="#d97706" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Report Comment</Text>
                  <Text style={styles.optionDesc}>Report this comment for review</Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowCommentOptionsModal(false);
                setSelectedComment(null);
              }}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: '#f3f4f6' }]}>
                <Ionicons name="close-outline" size={22} color="#6b7280" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionLabel}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      {/* Share to Connections Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareOverlay}>
          <View style={styles.shareContainer}>
            {/* Header */}
            <View style={styles.shareHeader}>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.shareTitle}>Share with Connections</Text>
              <TouchableOpacity 
                onPress={handleShareToConnections}
                disabled={selectedConnections.length === 0 || isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={[
                    styles.shareSendBtn,
                    selectedConnections.length === 0 && styles.shareSendBtnDisabled
                  ]}>
                    Send
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Optional Message Input */}
            <View style={styles.shareMessageWrap}>
              <TextInput
                style={styles.shareMessageInput}
                placeholder="Add a message (optional)"
                placeholderTextColor="#999"
                value={shareMessage}
                onChangeText={setShareMessage}
                multiline
                maxLength={200}
              />
            </View>
            
            {/* Post Preview */}
            <View style={styles.sharePostPreview}>
              <View style={styles.sharePostPreviewHeader}>
                <Image
                  source={authorProfileImage ? { uri: authorProfileImage } : FallbackImage}
                  style={styles.sharePreviewAvatar}
                />
                <View>
                  <Text style={styles.sharePreviewAuthor}>
                    {author.firstName} {author.lastName}
                  </Text>
                  <Text style={styles.sharePreviewTime}>{formatTimeAgo(post.createdAt)}</Text>
                </View>
              </View>
              <RichTextRenderer 
                text={post.content || 'Shared media'}
                style={styles.sharePreviewContent}
                numberOfLines={2}
                mentionedUsers={post.mentions || []}
              />
            </View>
            
            {/* Select All */}
            {connectionsList.length > 0 && (
              <TouchableOpacity 
                style={styles.selectAllRow}
                onPress={toggleSelectAll}
              >
                <View style={[
                  styles.checkbox,
                  selectedConnections.length === connectionsList.length && styles.checkboxSelected
                ]}>
                  {selectedConnections.length === connectionsList.length && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.selectAllText}>
                  {selectedConnections.length === connectionsList.length ? 'Deselect All' : 'Select All'}
                </Text>
                <Text style={styles.selectedCount}>
                  {selectedConnections.length} selected
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Connections List */}
            {loadingConnections ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading connections...</Text>
              </View>
            ) : connectionsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No connections yet</Text>
                <Text style={styles.emptySubtext}>
                  Connect with others to share posts
                </Text>
              </View>
            ) : (
              <FlatList
                data={connectionsList}
                keyExtractor={(item) => item._id || item.id}
                style={styles.connectionsList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const connectionId = item._id || item.id;
                  const isSelected = selectedConnections.includes(connectionId);
                  const connectionImage = getConnectionImage(item);
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.connectionItem,
                        isSelected && styles.connectionItemSelected
                      ]}
                      onPress={() => toggleConnectionSelection(connectionId)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected
                      ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                      <Image
                        source={connectionImage ? { uri: connectionImage } : FallbackImage}
                        style={styles.connectionAvatar}
                      />
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        {item.bio && (
                          <Text style={styles.connectionBio} numberOfLines={1}>
                            {item.bio}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* All Comments Modal - LinkedIn Style */}
      <Modal
        visible={showAllCommentsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllCommentsModal(false)}
      >
        <View style={styles.allCommentsOverlay}>
          <View style={styles.allCommentsContainer}>
            {/* Header */}
            <View style={styles.allCommentsHeader}>
              <TouchableOpacity 
                onPress={() => setShowAllCommentsModal(false)}
                style={styles.allCommentsCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.allCommentsTitle}>Comments</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {/* Comments List */}
            {loadingAllComments ? (
              <View style={styles.allCommentsLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.allCommentsLoadingText}>Loading comments...</Text>
              </View>
            ) : allComments.length === 0 ? (
              <View style={styles.allCommentsEmpty}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.allCommentsEmptyText}>No comments yet</Text>
                <Text style={styles.allCommentsEmptySubtext}>Be the first to comment</Text>
              </View>
            ) : (
              <FlatList
                data={allComments}
                keyExtractor={(item, index) => item._id || `comment-${index}`}
                style={styles.allCommentsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item: comment }) => {
                  const isLiked = comment.likes?.includes(currentUserId);
                  const likeCount = comment.likes?.length || 0;
                  const replyCount = comment.replies?.length || 0;
                  const showReplies = expandedReplies[comment._id];
                  
                  return (
                    <View style={styles.allCommentItem}>
                      <TouchableOpacity
                        onPress={() => {
                          const commentUserId = comment.userId?._id || comment.userId?.id;
                          if (commentUserId && commentUserId !== currentUserId) {
                            setShowAllCommentsModal(false);
                            navigation.navigate('UserProfile', { 
                              user: {
                                ...comment.userId,
                                id: commentUserId,
                                _id: commentUserId,
                              }
                            });
                          }
                        }}
                      >
                        <Image
                          source={(comment.userId?.profileImage || comment.userId?.photos?.[0])
                            ? { uri: getImageUrl(comment.userId?.profileImage || comment.userId?.photos?.[0]) }
                            : FallbackImage
                          }
                          style={styles.allCommentAvatar}
                        />
                      </TouchableOpacity>
                      <View style={styles.allCommentContent}>
                        <View style={styles.allCommentBubble}>
                          <TouchableOpacity
                            onPress={() => {
                              const commentUserId = comment.userId?._id || comment.userId?.id;
                              if (commentUserId && commentUserId !== currentUserId) {
                                setShowAllCommentsModal(false);
                                navigation.navigate('UserProfile', { 
                                  user: {
                                    ...comment.userId,
                                    id: commentUserId,
                                    _id: commentUserId,
                                  }
                                });
                              }
                            }}
                          >
                            <Text style={styles.allCommentAuthor}>
                              {comment.userId?.firstName} {comment.userId?.lastName}
                            </Text>
                          </TouchableOpacity>
                          <RichTextRenderer 
                            text={comment.text}
                            style={styles.allCommentText}
                            onHashtagPress={(hashtag) => {
                              setShowAllCommentsModal(false);
                              navigation.navigate('PostsFeed', { searchQuery: `#${hashtag}` });
                            }}
                          />
                        </View>
                        
                        {/* Comment Actions - Like & Reply */}
                        <View style={styles.commentActions}>
                          <Text style={styles.allCommentTime}>
                            {formatTimeAgo(comment.createdAt)}
                          </Text>
                          <TouchableOpacity 
                            style={styles.commentActionBtn}
                            onPress={() => handleLikeComment(comment._id)}
                          >
                            <Text style={[
                              styles.commentActionText,
                              isLiked && styles.commentActionTextActive
                            ]}>
                              Like {likeCount > 0 ? `(${likeCount})` : ''}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.commentActionBtn}
                            onPress={() => setReplyingToComment(comment)}
                          >
                            <Text style={styles.commentActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {/* Show Replies Toggle */}
                        {replyCount > 0 && (
                          <TouchableOpacity 
                            style={styles.viewRepliesBtn}
                            onPress={() => toggleReplies(comment._id)}
                          >
                            <Ionicons 
                              name={showReplies ? "chevron-up" : "chevron-down"} 
                              size={14} 
                              color="#581845" 
                            />
                            <Text style={styles.viewRepliesText}>
                              {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* Replies List */}
                        {showReplies && comment.replies?.map((reply, replyIndex) => {
                          const replyIsLiked = reply.likes?.includes(currentUserId);
                          const replyLikeCount = reply.likes?.length || 0;
                          const replyUserId = reply.userId?._id || reply.userId?.id;
                          const replyUserPhoto = reply.userId?.profileImage || reply.userId?.photos?.[0];
                          
                          return (
                            <View key={`reply-${replyIndex}`} style={styles.replyItem}>
                              <TouchableOpacity
                                onPress={() => {
                                  if (replyUserId && replyUserId !== currentUserId) {
                                    setShowAllCommentsModal(false);
                                    navigation.navigate('UserProfile', { 
                                      user: {
                                        ...reply.userId,
                                        id: replyUserId,
                                        _id: replyUserId,
                                      }
                                    });
                                  }
                                }}
                              >
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
                                  <TouchableOpacity
                                    onPress={() => {
                                      if (replyUserId && replyUserId !== currentUserId) {
                                        setShowAllCommentsModal(false);
                                        navigation.navigate('UserProfile', { 
                                          user: {
                                            ...reply.userId,
                                            id: replyUserId,
                                            _id: replyUserId,
                                          }
                                        });
                                      }
                                    }}
                                  >
                                    <Text style={styles.replyAuthor}>
                                      {reply.userId?.firstName} {reply.userId?.lastName}
                                    </Text>
                                  </TouchableOpacity>
                                  <Text style={styles.replyText}>{reply.text}</Text>
                                </View>
                                <View style={styles.replyActions}>
                                  <Text style={styles.replyTime}>
                                    {formatTimeAgo(reply.createdAt)}
                                  </Text>
                                  <TouchableOpacity 
                                    onPress={() => handleLikeReply(comment._id, replyIndex)}
                                  >
                                    <Text style={[
                                      styles.replyActionText,
                                      replyIsLiked && styles.commentActionTextActive
                                    ]}>
                                      Like {replyLikeCount > 0 ? `(${replyLikeCount})` : ''}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    onPress={() => setReplyingToComment(comment)}
                                  >
                                    <Text style={styles.replyActionText}>Reply</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                }}
              />
            )}
            
            {/* Reply Input (shown when replying to a comment) */}
            {replyingToComment && (
              <View style={styles.replyInputContainer}>
                <View style={styles.replyingToBar}>
                  <Text style={styles.replyingToText}>
                    Replying to {replyingToComment.userId?.firstName}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setReplyingToComment(null);
                    setShowReplyMentions(false);
                  }}>
                    <Ionicons name="close" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {/* Reply Mention Suggestions */}
                {showReplyMentions && connectionsList.length > 0 && (
                  <View style={styles.mentionSuggestionsContainer}>
                    <ScrollView 
                      keyboardShouldPersistTaps="handled"
                      horizontal={false}
                      style={styles.mentionSuggestionsList}
                    >
                      {connectionsList
                        .filter(conn => {
                          if (!replyMentionSearch) return true;
                          const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase();
                          return fullName.includes(replyMentionSearch.toLowerCase());
                        })
                        .slice(0, 5)
                        .map(conn => (
                          <TouchableOpacity
                            key={conn._id}
                            style={styles.mentionSuggestionItem}
                            onPress={() => handleSelectReplyMention(conn)}
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
                )}
                
                <View style={styles.replyInputRow}>
                  <TextInput
                    ref={replyInputRef}
                    value={replyText}
                    onChangeText={handleReplyTextChange}
                    placeholder="Write a reply... (use @ to mention)"
                    placeholderTextColor="#999"
                    style={styles.replyInput}
                    multiline
                  />
                  <TouchableOpacity 
                    onPress={handleReplyToComment}
                    disabled={!replyText.trim() || submittingReply}
                    style={styles.replySendBtn}
                  >
                    {submittingReply ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons 
                        name="send" 
                        size={20} 
                        color={replyText.trim() ? Colors.primary : '#ccc'} 
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  authorMeta: {
    fontSize: 13,
    color: '#777',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0f3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  connectionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#581845',
    marginLeft: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f0f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedBtn: {
    backgroundColor: '#e8dce5',
  },
  pendingBtn: {
    backgroundColor: '#f5f0f3',
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
  likeStatText: {
    fontSize: 13,
    color: '#581845',
    fontWeight: '600',
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
  commentInputContainer: {
    flex: 1,
    marginLeft: 10,
    position: 'relative',
  },
  commentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentMentionSuggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 1000,
  },
  commentMentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  commentMentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  commentMentionName: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  commentMentionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  commentMentionLoadingText: {
    fontSize: 12,
    color: '#666',
  },
  commentMentionEmpty: {
    padding: 12,
    alignItems: 'center',
  },
  commentMentionEmptyText: {
    fontSize: 12,
    color: '#999',
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
  commentOptionsBtn: {
    padding: 8,
    marginLeft: 4,
    alignSelf: 'center',
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
  repostCardContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 5,
  },
  repostIndicatorText: {
    color: '#581845',
    fontSize: 12,
    fontWeight: '600',
  },
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
    color: '#581845',
    marginLeft: 6,
    fontWeight: '600',
  },
  originalPostCard: {
    backgroundColor: '#581845' + '08',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
    borderWidth: 1,
    borderColor: '#581845' + '20',
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
    borderWidth: 1.5,
    borderColor: '#581845' + '30',
  },
  originalAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#581845',
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
  
  // Repost Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  repostModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  repostModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  repostModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeModalBtn: {
    padding: 4,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  visibilityOptions: {
    gap: 10,
    marginBottom: 20,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityOptionSelected: {
    backgroundColor: '#581845' + '10',
    borderColor: '#581845',
  },
  visibilityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#581845' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  visibilityIconSelected: {
    backgroundColor: '#581845',
  },
  visibilityTextWrap: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  visibilityTitleSelected: {
    color: '#581845',
  },
  visibilityDesc: {
    fontSize: 13,
    color: '#777',
  },
  captionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  captionInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  repostPreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#ddd',
  },
  previewAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  previewMeta: {
    fontSize: 11,
    color: '#888',
  },
  previewContent: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  repostBtn: {
    backgroundColor: '#581845',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  repostBtnDisabled: {
    backgroundColor: '#a0a0a0',
  },
  repostBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  originalEngagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#581845' + '15',
  },
  originalLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#581845' + '10',
    gap: 4,
  },
  originalLikeCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  viewOriginalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewOriginalText: {
    fontSize: 12,
    color: '#581845',
    fontWeight: '500',
    marginRight: 4,
  },
  
  // Options Modal Styles
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  
  // Report Modal Styles
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reportContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  reportSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  reportCategoriesScroll: {
    maxHeight: 350,
  },
  reportCategoriesList: {
    gap: 8,
    marginBottom: 20,
  },
  reportCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  reportCategorySelected: {
    backgroundColor: '#581845' + '10',
    borderColor: '#581845',
  },
  reportCategoryLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  reportCategoryLabelSelected: {
    color: '#581845',
    fontWeight: '600',
  },
  reportReasonInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  reportSubmitBtn: {
    backgroundColor: '#581845',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  reportSubmitBtnDisabled: {
    opacity: 0.6,
  },
  reportSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Share to Connections Modal Styles
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shareContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  shareSendBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581845',
  },
  shareSendBtnDisabled: {
    color: '#ccc',
  },
  shareMessageWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shareMessageInput: {
    fontSize: 15,
    color: '#333',
    minHeight: 40,
    maxHeight: 80,
  },
  sharePostPreview: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sharePostPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharePreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  sharePreviewAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  sharePreviewTime: {
    fontSize: 11,
    color: '#888',
  },
  sharePreviewContent: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectAllText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  selectedCount: {
    fontSize: 13,
    color: '#581845',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#581845',
    borderColor: '#581845',
  },
  connectionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  connectionItemSelected: {
    backgroundColor: '#58184508',
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 12,
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  connectionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  connectionBio: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  
  // All Comments Modal Styles (LinkedIn-style)
  allCommentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  allCommentsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  allCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  allCommentsCloseBtn: {
    padding: 4,
  },
  allCommentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  allCommentsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  allCommentsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  allCommentsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  allCommentsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  allCommentsEmptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  allCommentsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  allCommentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  allCommentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  allCommentContent: {
    flex: 1,
    marginLeft: 12,
  },
  allCommentBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 12,
  },
  allCommentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  allCommentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  
  // Comment Actions (Like & Reply)
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
    gap: 12,
  },
  commentActionBtn: {
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  commentActionTextActive: {
    color: '#581845',
  },
  
  // View Replies Toggle
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
    gap: 4,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#581845',
  },
  
  // Reply Items
  replyItem: {
    flexDirection: 'row',
    marginTop: 12,
    paddingLeft: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  replyContent: {
    flex: 1,
    marginLeft: 8,
  },
  replyBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 10,
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 4,
    gap: 10,
  },
  replyTime: {
    fontSize: 11,
    color: '#888',
  },
  replyActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  
  // Reply Input Container
  replyInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    backgroundColor: '#f5f5f5',
  },
  replyingToText: {
    fontSize: 13,
    color: '#666',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  replySendBtn: {
    padding: 8,
  },
  
  allCommentTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
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
  
  // Inline Comment Styles (with Like/Reply/Nested Replies)
  inlineCommentItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inlineCommentContent: {
    flex: 1,
    marginLeft: 10,
  },
  inlineCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 4,
    gap: 10,
  },
  inlineCommentTime: {
    fontSize: 11,
    color: '#999',
  },
  inlineActionBtn: {
    paddingVertical: 2,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  inlineActionTextActive: {
    color: '#581845',
  },
  inlineViewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
    gap: 4,
  },
  inlineViewRepliesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#581845',
  },
  inlineReplyItem: {
    flexDirection: 'row',
    marginTop: 10,
    paddingLeft: 6,
  },
  inlineReplyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f0f0f0',
  },
  inlineReplyContent: {
    flex: 1,
    marginLeft: 8,
  },
  inlineReplyBubble: {
    backgroundColor: '#f5f3f5',
    borderRadius: 14,
    padding: 10,
  },
  inlineReplyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  inlineReplyText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  inlineReplyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingLeft: 4,
    gap: 10,
  },
  inlineReplyInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 8,
  },
  inlineReplyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    backgroundColor: '#faf5f9',
    borderRadius: 8,
  },
  inlineReplyingToText: {
    fontSize: 12,
    color: '#581845',
    fontWeight: '500',
  },
  inlineMentionSuggestions: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inlineReplyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inlineReplyInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    maxHeight: 60,
    paddingVertical: 6,
  },
  inlineReplySendBtn: {
    padding: 6,
  },
});
