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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';

const EditProfileScreen = ({ navigation }) => {
    const { user, updateUser } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [origin, setOrigin] = useState('');
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [nickname, setNickname] = useState('');
    const [dob, setDob] = useState('');
    const [languages, setLanguages] = useState('');
    const [fieldOfStudy, setFieldOfStudy] = useState('');
    const [graduationYear, setGraduationYear] = useState('');
    const [industry, setIndustry] = useState('');
    const [currentRole, setCurrentRole] = useState('');
    const [linkedIn, setLinkedIn] = useState('');
    const [funFact, setFunFact] = useState('');
    const [rship, setRship] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showYearModal, setShowYearModal] = useState(false);
    const [availableYears, setAvailableYears] = useState([]);
    const [showRshipPicker, setShowRshipPicker] = useState(false);
    const [showOriginPicker, setShowOriginPicker] = useState(false);
    const [showIndustryPicker, setShowIndustryPicker] = useState(false);
    const [industrySearch, setIndustrySearch] = useState('');

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setOrigin(user.origin || '');
            setBio(user.bio || '');
            setNickname(user.nickname || '');
            setDob(user.dob || '');
            setLanguages(Array.isArray(user.languages) ? user.languages.join(', ') : user.languages || '');
            setFieldOfStudy(user.fieldOfStudy || '');
            setGraduationYear(user.graduationYear || '');
            setIndustry(user.industry || '');
            setCurrentRole(user.currentRole || '');
            setLinkedIn(user.linkedIn || '');
            setFunFact(user.funFact || '');
            setRship(user.rship || '');
            setInterests(user.interests || []);
            setPhotos(user.photos || []);
        }
    }, [user]);

    useEffect(() => {
        const startYear = 1980;
        const endYear = 2030;
        const years = [];
        for (let year = endYear; year >= startYear; year--) {
            years.push(year.toString());
        }
        setAvailableYears(years);
    }, []);

    const pickImages = async () => {
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
            const manipulated = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            uploadToCloudinary(manipulated.uri);
        }
    };

    const uploadToCloudinary = async (uri) => {
        const data = new FormData();
        data.append('file', {
            uri,
            type: 'image/jpeg',
            name: 'upload.jpg',
        });
        data.append('upload_preset', 'your_upload_preset');
        data.append('cloud_name', 'your_cloud_name');

        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/image/upload', {
                method: 'POST',
                body: data,
            });
            const json = await res.json();
            const imageUrl = json.secure_url;
            setPhotos(prev => [...prev, imageUrl]);
        } catch (err) {
            console.error('Cloudinary upload error:', err);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');

            const formData = new FormData();

            if (email) formData.append('email', email);
            if (phone) formData.append('phone', phone);
            if (origin) formData.append('origin', origin);
            if (bio) formData.append('bio', bio);
            if (nickname) formData.append('nickname', nickname);
            if (dob) formData.append('DOB', dob);
            if (languages) {
                const languageArray = languages
                    .split(',')
                    .map(lang => lang.trim())
                    .filter(lang => lang.length > 0);
                formData.append('languages', JSON.stringify(languageArray));
            }
            if (graduationYear) formData.append('graduationYear', graduationYear);
            if (industry) formData.append('industry', industry.replace(/^[^\w]+ /, ''));
            if (currentRole) formData.append('currentRole', currentRole);
            if (linkedIn) formData.append('linkedIn', linkedIn);
            if (funFact) formData.append('funFact', funFact);
            if (rship) formData.append('rship', rship);
            if (fieldOfStudy) formData.append('fieldOfStudy', fieldOfStudy);
            if (interests.length) formData.append('interests', JSON.stringify(interests));
            if (photos.length) formData.append('photos', JSON.stringify(photos));

            const res = await axios.put(`http://192.168.0.169:4000/accounts/${userId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.data?.user) {
                updateUser(res.data.user);
            }

            Alert.alert('Success', 'Profile updated successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating profile:', error.response || error.message);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.photoContainer}>
                {photos.length === 0 && <Text style={{ color: '#aaa', fontSize: 12 }}>No photo uploaded yet</Text>}
                {photos.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={styles.photo} />
                ))}
                <TouchableOpacity onPress={pickImages} style={styles.addPhotoBtn}>
                    <Text style={styles.addPhotoText}>+ Add Photo</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
};

export default EditProfileScreen;
