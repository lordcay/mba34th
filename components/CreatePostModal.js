// components/CreatePostModal.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  FlatList,
  Keyboard,
} from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';
import { getMyConnections } from '../services/connection.service';
import Colors from '../constants/Colors';

const FallbackImage = require('../assets/fff.jpg');

// Cloudinary config (same as used in PrivateChatScreen)
const CLOUDINARY_CLOUD = 'de2wocs21';
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_upload';
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`;

const CreatePostModal = ({ visible, onClose, onPostCreated }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  
  // Document attachments
  const [documents, setDocuments] = useState([]);
  
  // Poll builder state
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState('1 day');
  
  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Mention autocomplete state
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const inputRef = useRef(null);
  
  const MAX_IMAGES = 5;
  const MAX_CONTENT_LENGTH = 3000;
  
  // Fetch connections when modal opens
  useEffect(() => {
    if (visible) {
      fetchConnections();
    }
  }, [visible]);
  
  const fetchConnections = async () => {
    if (connections.length > 0) return; // Already loaded
    
    setLoadingConnections(true);
    try {
      const result = await getMyConnections();
      console.log('Fetched connections for mentions:', result);
      
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
      
      console.log('Parsed connections:', connectionList.length, 'connections');
      setConnections(connectionList);
    } catch (error) {
      console.log('Failed to fetch connections for mentions:', error);
    } finally {
      setLoadingConnections(false);
    }
  };
  
  // Filter connections based on mention search
  const filteredConnections = connections.filter(conn => {
    if (!mentionSearch) return true;
    const fullName = `${conn.firstName || ''} ${conn.lastName || ''}`.toLowerCase();
    return fullName.includes(mentionSearch.toLowerCase());
  }).slice(0, 5); // Limit to 5 suggestions
  
  // Handle text change to detect @ mentions - SIMPLIFIED APPROACH
  const handleContentChange = (text) => {
    setContent(text);
    
    // Find if there's an active @ mention being typed
    // Look for @ followed by optional text at the end or before cursor
    const atPattern = /@(\w*)$/;
    const match = text.match(atPattern);
    
    if (match) {
      // Found @ at end of text
      setMentionSearch(match[1] || '');
      setMentionStartIndex(text.length - match[0].length);
      setShowMentionSuggestions(true);
      return;
    }
    
    // Also check if @ is followed by text but cursor might be in middle
    // Find last @ not followed by space
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.slice(lastAtIndex + 1);
      // Check if there's no space after the @ (still typing mention)
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        // No space found after @ - user is still typing a mention
        const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setMentionSearch(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          return;
        }
      }
    }
    
    setShowMentionSuggestions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
  };
  
  // Insert selected mention
  const handleSelectMention = (connection) => {
    const mentionText = `@${connection.firstName}_${connection.lastName}`;
    const beforeMention = content.slice(0, mentionStartIndex);
    const afterMention = mentionStartIndex >= 0 ? '' : ''; // Since @ is at end
    
    const newContent = beforeMention + mentionText + ' ';
    setContent(newContent);
    setShowMentionSuggestions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
    
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  
  // Get user's profile image
  const userProfileImage = user?.photos?.[0] 
    ? (user.photos[0].startsWith('http') 
        ? user.photos[0] 
        : `https://three4th-street-backend.onrender.com${user.photos[0]}`)
    : (user?.profileImage
        ? (user.profileImage.startsWith('http')
            ? user.profileImage
            : `https://three4th-street-backend.onrender.com${user.profileImage}`)
        : null);
  
  // Upload to Cloudinary
  const uploadToCloudinary = async (uri, type = 'image') => {
    try {
      console.log('☁️ Cloudinary upload starting:', type);
      
      const uploadUrl = type === 'video' ? CLOUDINARY_VIDEO_URL : CLOUDINARY_IMAGE_URL;
      
      const formData = new FormData();
      const filename = uri.split('/').pop() || `${type}_${Date.now()}`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : (type === 'video' ? 'mp4' : 'jpg');
      const mimeType = type === 'video' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: mimeType,
        name: `${type}_${Date.now()}.${ext}`,
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'posts');
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const json = await response.json();
      console.log('☁️ Cloudinary response status:', response.status);
      
      if (response.ok && json.secure_url) {
        console.log('☁️ Upload successful:', json.secure_url);
        return json.secure_url;
      } else {
        console.error('☁️ Cloudinary error:', json?.error?.message || 'Unknown error');
        throw new Error(json?.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('☁️ Upload error:', error);
      throw error;
    }
  };
  
  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_IMAGES} images.`);
      return;
    }
    setShowEmojiPicker(false);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets?.[0]) {
      uploadImage(result.assets[0].uri);
    }
  };
  
  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(uri, 'image');
      setImages(prev => [...prev, cloudinaryUrl]);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const pickVideo = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_IMAGES} media files.`);
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 60, // 60 seconds max
    });
    
    if (!result.canceled && result.assets?.[0]) {
      uploadVideo(result.assets[0].uri);
    }
  };
  
  const uploadVideo = async (uri) => {
    setUploading(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(uri, 'video');
      setImages(prev => [...prev, cloudinaryUrl]);
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Upload Failed', 'Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // ═══════ Document Picker ═══════
  const pickDocument = async () => {
    setShowEmojiPicker(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-powerpoint',
               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
               'text/plain', 'text/csv'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (result.canceled) return;
      
      const file = result.assets?.[0];
      if (!file) return;
      
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Documents must be under 10 MB.');
        return;
      }
      
      setUploading(true);
      try {
        const cloudinaryUrl = await uploadDocToCloudinary(file);
        setDocuments(prev => [...prev, {
          url: cloudinaryUrl,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        }]);
      } catch (err) {
        Alert.alert('Upload Failed', 'Could not upload document. Try again.');
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };
  
  const uploadDocToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
      type: file.mimeType || 'application/octet-stream',
      name: file.name || `doc_${Date.now()}`,
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'post_documents');
    formData.append('resource_type', 'raw');
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`,
      { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } }
    );
    const json = await response.json();
    if (response.ok && json.secure_url) return json.secure_url;
    throw new Error(json?.error?.message || 'Upload failed');
  };
  
  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const getDocIcon = (mimeType) => {
    if (!mimeType) return 'document-outline';
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'grid-outline';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel-outline';
    if (mimeType.includes('word')) return 'document-outline';
    return 'document-outline';
  };
  
  // ═══════ Poll Builder ═══════
  const togglePollBuilder = () => {
    setShowEmojiPicker(false);
    if (showPollBuilder) {
      // Reset poll
      setShowPollBuilder(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollDuration('1 day');
    } else {
      setShowPollBuilder(true);
    }
  };
  
  const addPollOption = () => {
    if (pollOptions.length >= 8) {
      Alert.alert('Maximum Options', 'You can add up to 8 options.');
      return;
    }
    setPollOptions(prev => [...prev, '']);
  };
  
  const removePollOption = (index) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter((_, i) => i !== index));
  };
  
  const updatePollOption = (index, text) => {
    setPollOptions(prev => prev.map((opt, i) => i === index ? text : opt));
  };
  
  const POLL_DURATIONS = ['1 day', '3 days', '1 week', '2 weeks'];
  
  const getPollEndsAt = () => {
    const now = new Date();
    switch (pollDuration) {
      case '1 day': return new Date(now.getTime() + 86400000);
      case '3 days': return new Date(now.getTime() + 3 * 86400000);
      case '1 week': return new Date(now.getTime() + 7 * 86400000);
      case '2 weeks': return new Date(now.getTime() + 14 * 86400000);
      default: return new Date(now.getTime() + 86400000);
    }
  };
  
  const isPollValid = () => {
    if (!showPollBuilder) return true; // no poll = valid
    if (!pollQuestion.trim()) return false;
    const filledOptions = pollOptions.filter(o => o.trim());
    return filledOptions.length >= 2;
  };
  
  // ═══════ Emoji Picker ═══════
  const toggleEmojiPicker = () => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
    } else {
      Keyboard.dismiss();
      setShowEmojiPicker(true);
    }
  };
  
  const handleEmojiSelected = (emoji) => {
    setContent(prev => prev + emoji);
  };
  
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0 && !showPollBuilder && documents.length === 0) {
      Alert.alert('Empty Post', 'Please add some content, images, a poll, or documents.');
      return;
    }
    
    if (showPollBuilder && !isPollValid()) {
      Alert.alert('Incomplete Poll', 'Please add a question and at least 2 options.');
      return;
    }
    
    setSubmitting(true);
    try {
      const postData = {
        content: content.trim(),
        images,
        documents,
        postType: showPollBuilder ? 'poll' : (images.length > 0 ? 'image' : 'text'),
        visibility,
      };
      
      if (showPollBuilder) {
        postData.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter(o => o.trim()).map(text => ({ text: text.trim(), votes: [] })),
          endsAt: getPollEndsAt(),
        };
      }
      
      const result = await postService.createPost(postData);
      
      if (result.success) {
        if (onPostCreated) onPostCreated(result.data);
        handleClose();
        Alert.alert('Success', 'Your post has been published!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setContent('');
    setImages([]);
    setDocuments([]);
    setVisibility('public');
    setShowPollBuilder(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollDuration('1 day');
    setShowEmojiPicker(false);
    onClose();
  };
  
  const canPost = (content.trim().length > 0 || images.length > 0 || documents.length > 0 || (showPollBuilder && isPollValid()));
  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver
      avoidKeyboard
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!canPost || submitting}
            style={[styles.postBtn, canPost && styles.postBtnActive]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.postBtnText, canPost && styles.postBtnTextActive]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* User info */}
          <View style={styles.userRow}>
            <Image
              source={userProfileImage ? { uri: userProfileImage } : FallbackImage}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              
              {/* Visibility selector */}
              <TouchableOpacity 
                style={styles.visibilityBtn}
                onPress={() => {
                  const next = visibility === 'public' ? 'connections' : 'public';
                  setVisibility(next);
                }}
              >
                <Ionicons 
                  name={visibility === 'public' ? 'globe-outline' : 'people-outline'} 
                  size={14} 
                  color="#666" 
                />
                <Text style={styles.visibilityText}>
                  {visibility === 'public' ? 'Public' : 'Connections'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Content input */}
          <View style={styles.contentInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.contentInput}
              placeholder="What do you want to share? Use @ to mention, # for hashtags"
              placeholderTextColor="#999"
              multiline
              value={content}
              onChangeText={handleContentChange}
              maxLength={MAX_CONTENT_LENGTH}
            />
            
            {/* Mention suggestions dropdown */}
            {showMentionSuggestions && (
              <View style={styles.mentionSuggestions}>
                {loadingConnections ? (
                  <View style={styles.mentionLoading}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.mentionLoadingText}>Loading connections...</Text>
                  </View>
                ) : connections.length === 0 ? (
                  <View style={styles.mentionEmpty}>
                    <Text style={styles.mentionEmptyText}>No connections found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredConnections}
                    keyExtractor={(item) => item._id || item.id || String(Math.random())}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    ListEmptyComponent={
                      <View style={styles.mentionEmpty}>
                        <Text style={styles.mentionEmptyText}>No matches found</Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.mentionItem}
                        onPress={() => handleSelectMention(item)}
                      >
                        <Image
                          source={
                            item.photos?.[0] 
                              ? { uri: item.photos[0] }
                              : FallbackImage
                          }
                          style={styles.mentionAvatar}
                        />
                        <View style={styles.mentionInfo}>
                          <Text style={styles.mentionName}>
                            {item.firstName} {item.lastName}
                          </Text>
                          {item.currentRole && (
                            <Text style={styles.mentionRole} numberOfLines={1}>
                              {item.currentRole}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            )}
          </View>
          
          {/* Character count */}
          {content.length > MAX_CONTENT_LENGTH - 200 && (
            <Text style={[
              styles.charCount,
              remainingChars < 50 && styles.charCountWarning
            ]}>
              {remainingChars} characters remaining
            </Text>
          )}
          
          {/* Image preview */}
          {images.length > 0 && (
            <View style={styles.imagePreviewRow}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreviewWrap}>
                  <Image
                    source={{ uri: img.startsWith('http') ? img : `https://three4th-street-backend.onrender.com${img}` }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {/* Document Previews */}
          {documents.length > 0 && (
            <View style={styles.documentsSection}>
              {documents.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <View style={styles.docIconWrap}>
                    <Ionicons name={getDocIcon(doc.mimeType)} size={24} color="#581845" />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.docSize}>{formatFileSize(doc.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDocument(index)} style={styles.docRemoveBtn}>
                    <Ionicons name="close-circle" size={22} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {/* Poll Builder */}
          {showPollBuilder && (
            <View style={styles.pollBuilder}>
              <View style={styles.pollHeader}>
                <Text style={styles.pollTitle}>Create Poll</Text>
                <TouchableOpacity onPress={togglePollBuilder}>
                  <Ionicons name="close-circle" size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.pollQuestionInput}
                placeholder="Ask a question..."
                placeholderTextColor="#999"
                value={pollQuestion}
                onChangeText={setPollQuestion}
                maxLength={200}
                multiline
              />
              
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionRow}>
                  <View style={styles.pollOptionIndex}>
                    <Text style={styles.pollOptionIndexText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.pollOptionInput}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#bbb"
                    value={option}
                    onChangeText={(text) => updatePollOption(index, text)}
                    maxLength={100}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOption(index)} style={styles.pollRemoveOption}>
                      <Ionicons name="remove-circle-outline" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {pollOptions.length < 8 && (
                <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                  <Ionicons name="add-circle-outline" size={20} color="#581845" />
                  <Text style={styles.addOptionText}>Add option</Text>
                </TouchableOpacity>
              )}
              
              {/* Poll Duration */}
              <View style={styles.pollDurationSection}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.pollDurationLabel}>Poll duration:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationScroll}>
                  {POLL_DURATIONS.map(dur => (
                    <TouchableOpacity
                      key={dur}
                      style={[styles.durationChip, pollDuration === dur && styles.durationChipActive]}
                      onPress={() => setPollDuration(dur)}
                    >
                      <Text style={[styles.durationChipText, pollDuration === dur && styles.durationChipTextActive]}>
                        {dur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
          
          {/* Upload indicator */}
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading image...</Text>
            </View>
          )}
        </ScrollView>
        
        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity 
            style={styles.toolbarBtn}
            onPress={pickImage}
            disabled={uploading || images.length >= MAX_IMAGES}
          >
            <Ionicons 
              name="image-outline" 
              size={24} 
              color={images.length >= MAX_IMAGES ? '#ccc' : Colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarBtn}
            onPress={pickVideo}
            disabled={uploading}
          >
            <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarBtn}
            onPress={pickDocument}
            disabled={uploading || documents.length >= 5}
          >
            <Ionicons name="document-outline" size={24} color={documents.length >= 5 ? '#ccc' : Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolbarBtn, showPollBuilder && styles.toolbarBtnActive]}
            onPress={togglePollBuilder}
            disabled={uploading}
          >
            <Ionicons name="bar-chart-outline" size={24} color={showPollBuilder ? '#fff' : Colors.primary} />
            <Text style={[styles.toolbarLabel, showPollBuilder && { color: '#fff' }]}>Poll</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolbarBtn, showEmojiPicker && styles.toolbarBtnActive]}
            onPress={toggleEmojiPicker}
          >
            <Ionicons name="happy-outline" size={24} color={showEmojiPicker ? '#fff' : Colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <View style={styles.emojiPickerContainer}>
            <EmojiSelector
              onEmojiSelected={handleEmojiSelected}
              showSearchBar={true}
              showTabs={true}
              showHistory={true}
              showSectionTitles={true}
              category={Categories.all}
              columns={8}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreatePostModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  postBtnActive: {
    backgroundColor: '#581845',
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  postBtnTextActive: {
    color: '#fff',
  },
  
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  visibilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    gap: 4,
  },
  visibilityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  
  // Content input
  contentInputContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  contentInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  
  // Mention suggestions
  mentionSuggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 200,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  mentionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  mentionInfo: {
    marginLeft: 10,
    flex: 1,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  mentionRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mentionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  mentionLoadingText: {
    fontSize: 13,
    color: '#666',
  },
  mentionEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  mentionEmptyText: {
    fontSize: 13,
    color: '#999',
  },
  
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: '#e74c3c',
  },
  
  // Image preview
  imagePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  imagePreviewWrap: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  
  // Uploading
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: '#666',
  },
  
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  toolbarBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 4,
    borderRadius: 8,
  },
  toolbarBtnActive: {
    backgroundColor: '#581845',
  },
  toolbarLabel: {
    fontSize: 12,
    color: '#581845',
    fontWeight: '600',
  },
  
  // Documents
  documentsSection: {
    marginTop: 12,
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f4f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8dce8',
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0e6f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
    marginLeft: 10,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  docSize: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  docRemoveBtn: {
    padding: 4,
  },
  
  // Poll Builder
  pollBuilder: {
    marginTop: 16,
    backgroundColor: '#f8f4f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8dce8',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581845',
  },
  pollQuestionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0d0e0',
    marginBottom: 12,
    minHeight: 48,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pollOptionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollOptionIndexText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0d0e0',
  },
  pollRemoveOption: {
    padding: 4,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addOptionText: {
    fontSize: 14,
    color: '#581845',
    fontWeight: '600',
  },
  pollDurationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8dce8',
  },
  pollDurationLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  durationScroll: {
    flex: 1,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  durationChipActive: {
    backgroundColor: '#581845',
    borderColor: '#581845',
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  durationChipTextActive: {
    color: '#fff',
  },
  
  // Emoji Picker
  emojiPickerContainer: {
    height: 280,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
