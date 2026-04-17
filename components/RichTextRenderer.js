// components/RichTextRenderer.js
// Renders text with clickable hashtags (#), mentions (@), and URLs
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { navigate as rootNavigate } from '../navigation/RootNavigation';
import Colors from '../constants/Colors';

/**
 * RichTextRenderer - Renders text with interactive hashtags and mentions
 * 
 * @param {string} text - The text to render
 * @param {object} style - Additional text styles
 * @param {function} onHashtagPress - Callback when hashtag is pressed (receives hashtag without #)
 * @param {function} onMentionPress - Callback when mention is pressed (receives user object or username)
 * @param {number} numberOfLines - Line limit for text
 */
const RichTextRenderer = ({ 
  text, 
  style, 
  onHashtagPress, 
  onMentionPress,
  numberOfLines,
  mentionedUsers = [], // Array of {userId, username, firstName, lastName}
}) => {
  const navigation = useNavigation();

  if (!text) return null;

  // Ensure text is a string
  const inputString = typeof text === 'string' ? text : String(text);

  // Parse text into segments
  const parseText = (inputText) => {
    const segments = [];
    // Regex to match URLs, hashtags, and mentions
    const regex = /(https?:\/\/[^\s<>\"\']+|www\.[^\s<>\"\']+)|(#[\w\u0080-\uFFFF]+)|(@[\w\u0080-\uFFFF]+(?:\s[\w\u0080-\uFFFF]+)?)/g;
    
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(inputText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: inputText.slice(lastIndex, match.index),
        });
      }

      // Determine if it's a URL, hashtag, or mention
      const matchedText = match[0];
      if (match[1]) {
        // URL match
        let url = matchedText;
        if (url.startsWith('www.')) {
          url = 'https://' + url;
        }
        segments.push({
          type: 'url',
          content: matchedText,
          value: url,
        });
      } else if (matchedText.startsWith('#')) {
        segments.push({
          type: 'hashtag',
          content: matchedText,
          value: matchedText.slice(1), // Remove #
        });
      } else if (matchedText.startsWith('@')) {
        const username = matchedText.slice(1); // Remove @
        // Try to find the user in mentionedUsers
        const mentionedUser = mentionedUsers.find(u => 
          u.username === username || 
          `${u.firstName} ${u.lastName}`.toLowerCase() === username.toLowerCase() ||
          `${u.firstName}${u.lastName}`.toLowerCase() === username.toLowerCase().replace(/\s/g, '')
        );
        
        segments.push({
          type: 'mention',
          content: matchedText,
          value: username,
          user: mentionedUser || null,
        });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      segments.push({
        type: 'text',
        content: inputText.slice(lastIndex),
      });
    }

    return segments;
  };

  const handleHashtagPress = (hashtag) => {
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    } else {
      // Default: Navigate to search with hashtag
      // This will be handled by the parent screen
    }
  };

  const handleMentionPress = (mention) => {
    if (onMentionPress) {
      onMentionPress(mention);
    } else if (mention.user) {
      // Navigate to user profile
      navigation.navigate('UserProfile', { 
        user: {
          ...mention.user,
          id: mention.user.userId || mention.user._id || mention.user.id,
          _id: mention.user.userId || mention.user._id || mention.user.id,
        }
      });
    }
  };

  const handleUrlPress = (url) => {
    rootNavigate('SupportWeb', { url, title: '' });
  };

  const segments = parseText(inputString);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        if (segment.type === 'url') {
          return (
            <Text
              key={index}
              style={styles.url}
              onPress={() => handleUrlPress(segment.value)}
            >
              {segment.content}
            </Text>
          );
        }

        if (segment.type === 'hashtag') {
          return (
            <Text
              key={index}
              style={styles.hashtag}
              onPress={() => handleHashtagPress(segment.value)}
            >
              {segment.content}
            </Text>
          );
        }
        
        if (segment.type === 'mention') {
          return (
            <Text
              key={index}
              style={styles.mention}
              onPress={() => handleMentionPress(segment)}
            >
              {segment.content}
            </Text>
          );
        }
        
        return <Text key={index}>{segment.content}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  url: {
    color: '#1a73e8',
    textDecorationLine: 'underline',
  },
  hashtag: {
    color: Colors.primary,
    fontWeight: '600',
  },
  mention: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default RichTextRenderer;
