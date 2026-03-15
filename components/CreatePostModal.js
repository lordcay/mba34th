// components/CreatePostModal.js
import React, { useState, useContext } from 'react';
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
} from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import postService from '../services/post.service';
import api from '../services/api';

const FallbackImage = require('../assets/fff.jpg');

const CreatePostModal = ({ visible, onClose, onPostCreated }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState('public');
  
  const MAX_IMAGES = 5;
  const MAX_CONTENT_LENGTH = 3000;
  
  // Get user's profile image
  const userProfileImage = user?.photos?.[0] 
    ? (user.photos[0].startsWith('http') 
        ? user.photos[0] 
        : `http://192.168.100.4:4000${user.photos[0]}`)
    : null;
  
  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_IMAGES} images.`);
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri,
        name: filename,
        type,
      });
      
      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data?.imageUrl) {
        setImages(prev => [...prev, response.data.imageUrl]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or images to your post.');
      return;
    }
    
    setSubmitting(true);
    try {
      const postData = {
        content: content.trim(),
        images,
        postType: images.length > 0 ? 'image' : 'text',
        visibility,
      };
      
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
    setVisibility('public');
    onClose();
  };
  
  const canPost = content.trim().length > 0 || images.length > 0;
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
          <TextInput
            style={styles.contentInput}
            placeholder="What do you want to share?"
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={MAX_CONTENT_LENGTH}
          />
          
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
                    source={{ uri: img.startsWith('http') ? img : `http://192.168.100.4:4000${img}` }}
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
          
          {/* Upload indicator */}
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#581845" />
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
              color={images.length >= MAX_IMAGES ? '#ccc' : '#581845'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="videocam-outline" size={24} color="#581845" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="document-outline" size={24} color="#581845" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="bar-chart-outline" size={24} color="#581845" />
            <Text style={styles.toolbarLabel}>Poll</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="happy-outline" size={24} color="#581845" />
          </TouchableOpacity>
        </View>
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
  contentInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 0,
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
  },
  toolbarLabel: {
    fontSize: 12,
    color: '#581845',
    fontWeight: '600',
  },
});
