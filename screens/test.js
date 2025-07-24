
import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/de2wocs21/image/upload';
const UPLOAD_PRESET = 'unsigned_upload';

const EditProfileScreen = ({ navigation }) => {
    const { user, updateUser } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [nickname, setNickname] = useState('');
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setBio(user.bio || '');
            setNickname(user.nickname || '');
            setPhotos(user.photos || []);
        }
    }, [user]);

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            alert('Permission to access media library is required!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

        if (!result.canceled) {
            const uri = result.assets?.[0]?.uri || result.uri;
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const formData = new FormData();
            formData.append('file', {
                uri: manipulated.uri,
                type: 'image/jpeg',
                name: 'upload.jpg',
            });
            formData.append('upload_preset', UPLOAD_PRESET);

            try {
                const cloudRes = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                const cloudData = await cloudRes.json();
                if (cloudData.secure_url) {
                    setPhotos(prev => [...prev, cloudData.secure_url]);
                }
            } catch (err) {
                console.error('Upload error:', err);
                Alert.alert('Error', 'Image upload failed.');
            }
        }
    };

    const setAsProfilePhoto = (index) => {
        if (index === 0) return;
        const updated = [...photos];
        const [picked] = updated.splice(index, 1);
        updated.unshift(picked);
        setPhotos(updated);
    };

    const handleRemovePhoto = (index) => {
        Alert.alert('Delete Photo', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                onPress: () => {
                    const updated = [...photos];
                    updated.splice(index, 1);
                    setPhotos(updated);
                },
            },
        ]);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');

            const payload = {
                email,
                phone,
                bio,
                nickname,
                photos,
            };

            const res = await axios.put(
                `http://192.168.0.169:4000/accounts/${userId}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.user) {
                updateUser(res.data.user);
                Alert.alert('Success', 'Profile updated successfully!');
                navigation.goBack();
            }
        } catch (err) {
            console.error('❌ Update failed:', err);
            Alert.alert('Error', 'Update failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Edit Your Profile</Text>

            <Text style={styles.label}>Nickname</Text>
            <TextInput style={styles.input} value={nickname} onChangeText={setNickname} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline />

            <Text style={styles.label}>Photos</Text>
            <View style={styles.photoGrid}>
                {photos.map((uri, idx) => (
                    <View key={idx} style={styles.photoWrapper}>
                        <TouchableOpacity
                            onPress={() => {
                                if (idx !== 0) {
                                    setSelectedPhotoIndex(idx);
                                    setShowConfirmModal(true);
                                }
                            }}
                        >
                            <Image
                                source={{ uri }}
                                style={[styles.photo, idx === 0 && styles.firstPhotoBorder]}
                            />
                            {idx === 0 && <Text style={styles.profileLabel}>Profile Photo</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePhoto(idx)}>
                            <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {photos.length < 6 && (
                    <TouchableOpacity onPress={pickImage} style={styles.addPhotoBtn}>
                        <Text style={styles.addPhotoText}>+ Add Photo</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showConfirmModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalText}>Set this as your profile photo?</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtn}
                                onPress={() => {
                                    setShowConfirmModal(false);
                                    setAsProfilePhoto(selectedPhotoIndex);
                                }}
                            >
                                <Text style={styles.modalBtnText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: '#ccc' }]}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 24, fontWeight: '700', color: '#581845', marginBottom: 20 },
    label: { marginTop: 15, marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    photoWrapper: { position: 'relative', marginRight: 10 },
    photo: { width: 100, height: 100, borderRadius: 8 },
    firstPhotoBorder: { borderWidth: 2, borderColor: '#581845' },
    profileLabel: { fontSize: 12, color: '#581845', textAlign: 'center', marginTop: 4 },
    removeBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    removeText: { color: 'red', fontSize: 14, fontWeight: 'bold' },
    addPhotoBtn: {
        width: 100,
        height: 100,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoText: { fontSize: 12, color: '#555', textAlign: 'center' },
    modalOverlay: {
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    modalBox: {
        backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', alignItems: 'center',
    },
    modalText: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#581845', borderRadius: 8 },
    modalBtnText: { color: '#fff', fontWeight: '600' },
    saveButton: { backgroundColor: '#581845', paddingVertical: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default EditProfileScreen;
