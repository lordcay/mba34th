// components/LinkPreview.js
// WhatsApp-style link preview card with OG metadata
import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getLinkPreview } from 'link-preview-js';
import { navigate as rootNavigate } from '../navigation/RootNavigation';

// In-memory cache to avoid re-fetching previews
const previewCache = new Map();

const LinkPreview = memo(({ url, isMine }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) return;

    // Check cache first
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    getLinkPreview(url, {
      timeout: 8000,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      followRedirects: 'follow',
    })
      .then((data) => {
        if (cancelled || !mounted.current) return;
        const result = {
          title: data.title || '',
          description: data.description || '',
          image: (data.images && data.images.length > 0) ? data.images[0] : (data.favicons && data.favicons.length > 0 ? data.favicons[0] : null),
          siteName: data.siteName || extractDomain(url),
          url: data.url || url,
        };
        previewCache.set(url, result);
        setPreview(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled || !mounted.current) return;
        setError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  const handlePress = () => {
    rootNavigate('SupportWeb', { url, title: preview?.title || '' });
  };

  if (error || (!loading && !preview)) return null;

  if (loading) {
    return (
      <View style={[styles.container, isMine && styles.containerMine]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#888" />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </View>
    );
  }

  const hasImage = preview.image && typeof preview.image === 'string';
  const hasTitle = preview.title && preview.title.trim().length > 0;
  const hasDescription = preview.description && preview.description.trim().length > 0;

  if (!hasTitle && !hasDescription && !hasImage) return null;

  return (
    <TouchableOpacity
      style={[styles.container, isMine && styles.containerMine]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {hasImage && (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.siteName} numberOfLines={1}>
          {preview.siteName}
        </Text>
        {hasTitle && (
          <Text style={styles.title} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {hasDescription && (
          <Text style={styles.description} numberOfLines={3}>
            {preview.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// URL extraction helper used by chat screens
export function extractFirstUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(https?:\/\/[^\s<>\"\']+|www\.[^\s<>\"\']+)/);
  if (!match) return null;
  const url = match[0];
  return url.startsWith('www.') ? 'https://' + url : url;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
  },
  containerMine: {
    borderLeftColor: '#d4a5c9',
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#e0e0e0',
  },
  textContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  siteName: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
});

export default LinkPreview;
