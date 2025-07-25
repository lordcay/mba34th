// UserProfileScreen.js
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment';

const UserProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = route.params;
    const school = user?.email?.split('@')[1]?.split('.')[0] || 'Unknown School';

    const parseLanguages = (languages) => {
        try {
            if (Array.isArray(languages)) return languages.join(', ');
            if (typeof languages === 'string') return JSON.parse(languages).join(', ');
            return 'N/A';
        } catch (error) {
            return 'N/A';
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Profile Picture Header */}
            <View style={styles.profileHeader}>
                <Image
                    source={{
                        uri:
                            user.photos && user.photos.length > 0
                                ? user.photos[0].startsWith('http')
                                    ? user.photos[0]
                                    : `http://192.168.0.169:4000${user.photos[0]}`
                                : 'https://via.placeholder.com/150',
                    }}
                    style={styles.profilePic}
                />
                <Text style={styles.fullName}>{user.firstName} {user.lastName}</Text>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('PrivateChat', { user })}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                    <Text style={styles.editBtnText}> Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Photo Gallery */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gallery</Text>
                {user.photos && user.photos.length > 0 ? (
                    <FlatList
                        data={user.photos}
                        horizontal
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, index }) => (
                            <View style={{ alignItems: 'center', marginRight: 12 }}>
                                <Image
                                    source={{
                                        uri: item.startsWith('http') ? item : `http://192.168.0.169:4000${item}`,
                                    }}
                                    style={styles.galleryImage}
                                />
                                {index === 0 && (
                                    <Text style={styles.profilePhotoLabel}>Profile Photo</Text>
                                )}
                            </View>
                        )}
                    />
                ) : (
                    <Text style={styles.placeholderText}>No photos uploaded yet.</Text>
                )}
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <InfoRow label="Nickname" value={user.nickname} />
                {/* <InfoRow label="Email" value={user.email} /> */}
                {/* <InfoRow label="Phone Number" value={user.phone} /> */}
                <InfoRow label="Gender" value={user.gender} />
                <InfoRow label="Date of Birth" value={user.DOB?.slice(0, 10) || 'N/A'} />
                <InfoRow label="Languages Spoken" value={parseLanguages(user.languages)} />
                <InfoRow label="Origin" value={user.origin} />

            </View>

            {/* Academic Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Academic Details</Text>
                <InfoRow label="University" value={school} />
                <InfoRow label="Program of Study" value={user.fieldOfStudy} />
                <InfoRow label="Field of Study" value={user.type} />
                <InfoRow label="Graduation Year" value={user.graduationYear} />
            </View>

            {/* Professional Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Information</Text>
                <InfoRow label="Industry" value={user.industry} />
                <InfoRow label="Current Role" value={user.currentRole} />
                <InfoRow label="LinkedIn" value={user.linkedIn} />
            </View>

            {/* Bio and Interests */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.sectionContent}>{user.bio || 'No bio available.'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interests</Text>
                {user.interests && user.interests.length > 0 ? (
                    <View style={styles.interestsContainer}>
                        {user.interests.map((interest, index) => (
                            <View key={index} style={styles.interestPill}>
                                <Text style={styles.interestText}>{interest}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>No interests added yet.</Text>
                )}
            </View>

            {/* Other Info */}
            <View style={styles.section}>
                <InfoRow label="Fun Fact" value={user.funFact} />
                <InfoRow label="Relationship Status" value={user.rship} />
                <InfoRow label="Joined" value={moment(user.created).format('LL')} />
            </View>
        </ScrollView>
    );
};

const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        flex: 1,
    },
    profileHeader: {
        alignItems: 'center',
        marginTop: '20%',
        paddingVertical: 30,
        backgroundColor: '#f1f3f6',
    },
    profilePic: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#581845',
    },
    fullName: {
        fontSize: 22,
        fontWeight: '600',
        marginTop: 12,
        color: '#333',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#581845',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editBtnText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#222',
    },
    sectionContent: {
        fontSize: 14,
        color: '#555',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoLabel: {
        color: '#666',
        fontSize: 14,
        flex: 1,
    },
    infoValue: {
        color: '#222',
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
    },
    galleryImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    profilePhotoLabel: {
        marginTop: 4,
        fontSize: 12,
        color: '#581845',
        fontWeight: '600',
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
    },
    interestPill: {
        backgroundColor: '#581845',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginRight: 8,
        marginBottom: 8,
    },
    interestText: {
        color: '#fff',
        fontSize: 12,
    },
    placeholderText: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 5,
    },
});

export default UserProfileScreen;
