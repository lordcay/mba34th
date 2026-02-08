import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Modal,
  FlatList,
} from "react-native";
import React, { useState, useEffect, useLayoutEffect, useMemo } from "react";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getRegistrationProgress, saveRegistrationProgress } from "../registrationUtils";
import logo2 from "../assets/logo1.png";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ keep your universities array exactly as you already have it
const universities = [
  { name: "Choose a university", extension: "" },
  { name: "American Uni.", extension: "@american.edu" },
  { name: "Arizona State", extension: "@asu.edu" },
  { name: "Babson", extension: "@babson.edu" },
  { name: "Bayes", extension: "@city.ac.uk" },
  { name: "Boston University", extension: "@bu.edu" },
  { name: "Cambridge", extension: "@cam.ac.uk" },
  { name: "Canada West", extension: "@ucanada.ca" },
  { name: "Carnegie Mellon", extension: "@tepper.cmu.edu" },
  { name: "Chicago Booth", extension: "@chicagobooth.edu" },
  { name: "Columbia", extension: "@gsbcolumbia.edu" },
  { name: "Cornell", extension: "@cornell.edu" },
  { name: "Cranfield", extension: "@cranfield.ac.uk" },
  { name: "Darden", extension: "@darden.virginia.edu" },
  { name: "Duke", extension: "@duke.edu" },
  { name: "Emory", extension: "@emory.edu" },
  { name: "Georgetown Uni.", extension: "@georgetown.edu" },
  { name: "Georgia Institute of Technology", extension: "@gatech.edu" },
  { name: "Esade ", extension: "@esade.edu" },
  { name: "Haas", extension: "@haas.berkeley.edu" },
  { name: "Harvard", extension: "@hbs.edu" },
  { name: "HEC", extension: "@hec.edu" },
  { name: "IESE", extension: "@iese.edu" },
  { name: "IMD", extension: "@imd.org" },
  { name: "Imperial", extension: "@imperial.ac.uk" },
  { name: "Indiana University", extension: "@iu.edu" },
  { name: "INSEAD", extension: "@insead.edu" },
  { name: "Johns Hopkins", extension: "@jhu.edu" },
  { name: "Kellog", extension: "@kellogg.northwestern.edu" },
  { name: "LBS", extension: "@london.edu" },
  { name: "Leeds", extension: "@leeds.ac.uk" },
  { name: "McGill", extension: "@mcgill.ca" },
  { name: "Michigan State", extension: "@msu.edu" },
  { name: "MIT", extension: "@mit.edu" },
  { name: "NYU", extension: "@stern.nyu.edu" },
  { name: "Ohio State", extension: "@osu.edu" },
  { name: "Owen", extension: "@owen.vanderbilt.edu" },
  { name: "Oxford", extension: "@ox.ac.uk" },
  { name: "Purdue Uni", extension: "@purdue.edu" },
  { name: "Queen’s Uni.", extension: "@queensu.ca" },
  { name: "Rice", extension: "@rice.edu" },
  { name: "Rotman", extension: "@utoronto.ca" },
  { name: "Southwales", extension: "@students.southwales.ac.uk." },
  { name: "Temple", extension: "@temple.edu" },
  { name: "Tuck", extension: "@tuck.dartmouth.edu" },
  { name: "UCLA", extension: "@anderson.ucla.edu" },
  { name: "UNC", extension: "@kenan-flagler.unc.edu" },
  { name: "Uni. of California", extension: "@ucdavis.edu" },
  { name: "Uni. of California", extension: "@uci.edu" },
  { name: "Uni. of Louisville", extension: "@louisville.edu" },
  { name: "Uni. of Maryland", extension: "@umd.edu" },
  { name: "Uni. of Michigan", extension: "@umich.edu" },
  { name: "Uni. of Notre Dame", extension: "@nd.edu" },
  { name: "Uni. of Pittsburgh", extension: "@pitt.edu" },
  { name: "Uni. of Rochester", extension: "@rochester.edu" },
  { name: "Uni.of Cambridge", extension: "@jbs.cam.ac.uk" },
  { name: "Uni.of Minnesota", extension: "@umn.edu" },
  { name: "USC", extension: "@usc.edu" },
  { name: "UT Austin", extension: "@my.utexas.edu" },
  { name: "Vanderbilt", extension: "@vanderbilt.edu" },
  { name: "Warwick", extension: "@wbs.ac.uk" },
  { name: "WashU", extension: "@wustl.edu" },
  { name: "Western Uni.", extension: "@uwo.ca" },
  { name: "Wharton", extension: "@wharton.upenn.edu" },
  { name: "William & Mary", extension: "@wm.edu" },
  { name: "Yale", extension: "@yale.edu" },
  { name: "York University", extension: "@schulich.yorku.ca" },
  { name: "Uni of Illinois Chicago ", extension: "@uic.edu" },
];

const normalizeText = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");

const EmailScreen = () => {
  const [emailUsername, setEmailUsername] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const SUPPORT_EMAIL = "schoolupdate@34thstreet.net";

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ✅ Modal state
  const [schoolModalVisible, setSchoolModalVisible] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");

  // ✅ kbHeight is ONLY for the modal
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!schoolModalVisible) {
      setKbHeight(0);
      return;
    }

    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates?.height || 0)
    );

    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, [schoolModalVisible]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerTitle: "",
      headerBackTitle: "Back",
      headerBackTitleVisible: true,
      headerStyle: {
        backgroundColor: "#ffffff",
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: "#581845",
      headerShadowVisible: false,
    });
  }, [navigation]);

  useEffect(() => {
    getRegistrationProgress("Email").then((progressData) => {
      if (progressData) {
        setEmailUsername(progressData.emailUsername || "");
        setSelectedUniversity(progressData.selectedUniversity || "");
      }
    });
  }, []);

  const selectedDomain = useMemo(() => {
    return universities.find((uni) => uni.name === selectedUniversity)?.extension || "";
  }, [selectedUniversity]);

  const filteredUniversities = useMemo(() => {
    const q = normalizeText(schoolQuery);
    const list = universities.filter((u) => u.name !== "Choose a university");

    if (!q) return list;

    const starts = list.filter((u) => normalizeText(u.name).startsWith(q));
    const contains = list.filter((u) => normalizeText(u.name).includes(q));
    return [...starts, ...contains.filter((u) => !starts.includes(u))];
  }, [schoolQuery]);

  const handleNext = () => {
    if (!selectedUniversity || selectedUniversity === "Choose a university") {
      setErrorMessage("All fields are required.");
      return;
    }
    if (emailUsername.trim() === "") {
      setErrorMessage("Please enter your email username.");
      return;
    }

    setErrorMessage("");
    const fullEmail = `${emailUsername.toLowerCase()}${selectedDomain}`;
    saveRegistrationProgress("Email", { email: fullEmail, selectedUniversity });
    navigation.navigate("PasswordScreen");
  };

  const openEmailClient = () => {
    const subject = "Add my school to 34th Street";
    const body = [
      "School name:",
      "Official school email domain (e.g., @duke.edu):",
      "Country:",
      "Program (MBA/MSc/etc.):",
    ].join("\n");

    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Email app not found", `Please email us at ${SUPPORT_EMAIL} from your mail app.`);
    });
  };

  const openSchoolPicker = () => {
    Keyboard.dismiss();
    setSchoolQuery("");
    setSchoolModalVisible(true);
  };

  const closeSchoolPicker = () => {
    Keyboard.dismiss();
    setSchoolModalVisible(false);
    setSchoolQuery("");
  };

  const selectSchool = (schoolName) => {
    setSelectedUniversity(schoolName);
    setErrorMessage("");
    closeSchoolPicker();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        {/* ✅ Main screen keyboard handling (clean) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image source={logo2} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.headerSubtitle}>Connect across top universities</Text>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: "40%" }]} />
              </View>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Select Your University</Text>

              <TouchableOpacity activeOpacity={0.9} style={styles.dropdown} onPress={openSchoolPicker}>
                <Text
                  style={[
                    styles.dropdownText,
                    (!selectedUniversity || selectedUniversity === "Choose a university") &&
                      styles.dropdownPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedUniversity && selectedUniversity !== "Choose a university"
                    ? selectedUniversity
                    : "Choose a university"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#581845" />
              </TouchableOpacity>

              <Text style={styles.label}>Enter your school email</Text>
              <View style={styles.emailContainer}>
                <TextInput
                  value={emailUsername}
                  onChangeText={(text) => {
                    setEmailUsername(text);
                    if (text.trim() !== "") setErrorMessage("");
                  }}
                  style={styles.emailInput}
                  placeholder="your.username"
                  placeholderTextColor={"#BEBEBE"}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />

                {!!selectedDomain && selectedUniversity !== "Choose a university" && (
                  <Text style={styles.emailSuffix}>{selectedDomain}</Text>
                )}
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Text style={styles.noteText}>Email verification helps us keep our community safe.</Text>

              <Text style={styles.noteText2}>
                If your school isn’t listed, kindly email us at{" "}
                <Text style={styles.mailLink} accessibilityRole="link" onPress={openEmailClient}>
                  {SUPPORT_EMAIL}
                </Text>
              </Text>

              <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextButton}>
                <MaterialCommunityIcons name="arrow-right-circle" size={48} color="#581845" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ✅ Modal: keyboard-aware bottom sheet */}
          <Modal visible={schoolModalVisible} animationType="slide" transparent onRequestClose={closeSchoolPicker}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay} />
              </TouchableWithoutFeedback>

              <View
                style={[
                  styles.modalCard,
                  {
                    paddingTop: 14,
                    paddingBottom: (kbHeight ? kbHeight * 0.15 : 16) + insets.bottom,
                  },
                ]}
              >
                <View style={styles.modalTopRow}>
                  <TouchableOpacity onPress={closeSchoolPicker} activeOpacity={0.8} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color="#777" />
                  <TextInput
                    value={schoolQuery}
                    onChangeText={setSchoolQuery}
                    placeholder="Search your school (e.g., Duke, Darden...)"
                    placeholderTextColor="#999"
                    style={styles.searchInput}
                    autoFocus
                  />
                </View>

                <FlatList
                  data={filteredUniversities}
                  keyExtractor={(item) => `${item.name}_${item.extension}`}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={{ paddingBottom: kbHeight + 24 }}
                  style={{ maxHeight: 420 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.schoolRow} onPress={() => selectSchool(item.name)}>
                      <Text style={styles.schoolName}>{item.name}</Text>
                      <Text style={styles.schoolDomain}>{item.extension}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default EmailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1 },

  header: {
    backgroundColor: "#581845",
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    padding: 40,
    alignItems: "center",
  },
  logoWrapper: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 80,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 10,
  },
  logo: { width: 120, height: 80, marginBottom: 10 },

  progressContainer: {
    height: 8,
    width: "80%",
    backgroundColor: "#eee",
    borderRadius: 4,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#ffb60a" },

  headerSubtitle: { fontSize: 14, color: "#ffb60a", marginTop: 5 },

  formContainer: { marginTop: 10, marginHorizontal: 20 },

  label: { marginTop: 20, fontSize: 16, fontWeight: "bold", color: "#581845" },

  dropdown: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: { fontSize: 16, color: "#111", fontWeight: "700", flex: 1, marginRight: 10 },
  dropdownPlaceholder: { color: "#888", fontWeight: "600" },

  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#111",
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginTop: 10,
    overflow: "hidden",
  },
  emailInput: { flex: 1, fontSize: 22, color: "#111" },
  emailSuffix: { fontSize: 18, color: "gray", fontWeight: "700" },

  noteText: { fontSize: 12, color: "#581845", fontStyle: "italic", marginBottom: 10, marginTop: 10 },
  noteText2: { fontSize: 12, color: "#581845", fontStyle: "italic" },

  nextButton: { marginTop: 30, alignSelf: "center" },

  errorText: { color: "red", fontSize: 14, marginTop: 6 },

  mailLink: {
    color: "#581845",
    fontWeight: "800",
    textDecorationLine: "underline",
    textDecorationColor: "#581845",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  modalTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 10,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cancelText: {
    color: "#581845",
    fontWeight: "900",
    fontSize: 14,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f5f7",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },

  schoolRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  schoolName: { fontSize: 15, fontWeight: "800", color: "#111" },
  schoolDomain: { marginTop: 3, fontSize: 12, color: "#777", fontWeight: "600" },
});












// import {
//   StyleSheet,
//   Text,
//   View,
//   SafeAreaView,
//   Image,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   TouchableWithoutFeedback,
//   Keyboard,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   Linking,
//   Modal,
//   Pressable,
//   FlatList,
// } from "react-native";
// import React, { useState, useEffect, useLayoutEffect, useMemo } from "react";
// import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
// import { Ionicons } from "@expo/vector-icons";
// import { useNavigation } from "@react-navigation/native";
// import { getRegistrationProgress, saveRegistrationProgress } from "../registrationUtils";
// import logo2 from "../assets/logo1.png";
// import { useSafeAreaInsets } from "react-native-safe-area-context";


// // ✅ keep your universities array exactly as you already have it
// const universities = [
//   { name: 'Choose a university', extension: '' },
//   { name: 'American Uni.', extension: '@american.edu' },
//   { name: 'Arizona State', extension: '@asu.edu' },
//   { name: 'Babson', extension: '@babson.edu' },
//   { name: 'Bayes', extension: '@city.ac.uk' },
//   { name: 'Boston University', extension: '@bu.edu' },
//   { name: 'Cambridge', extension: '@cam.ac.uk' },
//   { name: 'Canada West', extension: '@ucanada.ca' },
//   { name: 'Carnegie Mellon', extension: '@tepper.cmu.edu' },
//   { name: 'Chicago Booth', extension: '@chicagobooth.edu' },
//   { name: 'Columbia', extension: '@gsbcolumbia.edu' },
//   { name: 'Cornell', extension: '@cornell.edu' },
//   { name: 'Cranfield', extension: '@cranfield.ac.uk' },
//   { name: 'Darden', extension: '@darden.virginia.edu' },
//   { name: 'Duke', extension: '@duke.edu' },
//   { name: 'Emory', extension: '@emory.edu' },
//   { name: 'Georgetown Uni.', extension: '@georgetown.edu' },
//   { name: 'Georgia Institute of Technology', extension: '@gatech.edu' },
//   { name: 'Esade ', extension: '@esade.edu' },
//   { name: 'Haas', extension: '@haas.berkeley.edu' },
//   { name: 'Harvard', extension: '@hbs.edu' },
//   { name: 'HEC', extension: '@hec.edu' },
//   { name: 'IESE', extension: '@iese.edu' },
//   { name: 'IMD', extension: '@imd.org' },
//   { name: 'Imperial', extension: '@imperial.ac.uk' },
//   { name: 'Indiana University', extension: '@iu.edu' },
//   { name: 'INSEAD', extension: '@insead.edu' },
//   { name: 'Johns Hopkins', extension: '@jhu.edu' },
//   { name: 'Kellog', extension: '@kellogg.northwestern.edu' },
//   { name: 'LBS', extension: '@london.edu' },
//   { name: 'Leeds', extension: '@leeds.ac.uk' },
//   { name: 'McGill', extension: '@mcgill.ca' },
//   { name: 'Michigan State', extension: '@msu.edu' },
//   { name: 'MIT', extension: '@mit.edu' },
//   { name: 'NYU', extension: '@stern.nyu.edu' },
//   { name: 'Ohio State', extension: '@osu.edu' },
//   { name: 'Owen', extension: '@owen.vanderbilt.edu' },
//   { name: 'Oxford', extension: '@ox.ac.uk' },
//   { name: 'Purdue Uni', extension: '@purdue.edu' },
//   { name: 'Queen’s Uni.', extension: '@queensu.ca' },
//   { name: 'Rice', extension: '@rice.edu' },
//   { name: 'Rotman', extension: '@utoronto.ca' },
//   { name: 'Southwales', extension: '@students.southwales.ac.uk.' },
//   { name: 'Temple', extension: '@temple.edu' },
//   { name: 'Tuck', extension: '@tuck.dartmouth.edu' },
//   { name: 'UCLA', extension: '@anderson.ucla.edu' },
//   { name: 'UNC', extension: '@kenan-flagler.unc.edu' },
//   { name: 'Uni. of California', extension: '@ucdavis.edu' },
//   { name: 'Uni. of California', extension: '@uci.edu' },
//   { name: 'Uni. of Louisville', extension: '@louisville.edu' },
//   { name: 'Uni. of Maryland', extension: '@umd.edu' },
//   { name: 'Uni. of Michigan', extension: '@umich.edu' },
//   { name: 'Uni. of Notre Dame', extension: '@nd.edu' },
//   { name: 'Uni. of Pittsburgh', extension: '@pitt.edu' },
//   { name: 'Uni. of Rochester', extension: '@rochester.edu' },
//   // { name: 'Uni. of Rochester', extension: '@rochester.edu' },
//   { name: 'Uni.of Cambridge', extension: '@jbs.cam.ac.uk' },
//   { name: 'Uni.of Minnesota', extension: '@umn.edu' },
//   { name: 'USC', extension: '@usc.edu' },
//   { name: 'UT Austin', extension: '@my.utexas.edu' },
//   { name: 'Vanderbilt', extension: '@vanderbilt.edu' },
//   { name: 'Warwick', extension: '@wbs.ac.uk' },
//   { name: 'WashU', extension: '@wustl.edu' },
//   { name: 'Western Uni.', extension: '@uwo.ca' },
//   { name: 'Wharton', extension: '@wharton.upenn.edu' },
//   { name: 'William & Mary', extension: '@wm.edu' },
//   { name: 'Yale', extension: '@yale.edu' },
//   { name: 'York University', extension: '@schulich.yorku.ca' },
//   { name: 'Uni of Illinois Chicago ', extension: '@uic.edu' },
// ];

// const normalizeText = (s = "") =>
//   String(s)
//     .toLowerCase()
//     .trim()
//     .normalize("NFD")                 // handles accents
//     .replace(/[\u0300-\u036f]/g, "")  // removes accent marks
//     .replace(/[’']/g, "'");           // smart apostrophe → normal apostrophe

// const EmailScreen = () => {
//   const [emailUsername, setEmailUsername] = useState("");
//   const [selectedUniversity, setSelectedUniversity] = useState("");
//   const navigation = useNavigation();
//   const [errorMessage, setErrorMessage] = useState("");
//   const SUPPORT_EMAIL = "schoolupdate@34thstreet.net";
//   const [kbHeight, setKbHeight] = useState(0);
//   const insets = useSafeAreaInsets();



//   useEffect(() => {
//   const show = Keyboard.addListener(
//     Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
//     (e) => setKbHeight(e.endCoordinates?.height || 0)
//   );
//   const hide = Keyboard.addListener(
//     Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
//     () => setKbHeight(0)
//   );

//   return () => {
//     show.remove();
//     hide.remove();
//   };
// }, []);
//   // ✅ dropdown modal state
//   const [schoolModalVisible, setSchoolModalVisible] = useState(false);
//   const [schoolQuery, setSchoolQuery] = useState("");

//   useLayoutEffect(() => {
//     navigation.setOptions({
//       headerShown: true,
//       headerTransparent: false,
//       headerTitle: "",
//       headerBackTitle: "Back",
//       headerBackTitleVisible: true,
//       headerStyle: {
//         backgroundColor: "#ffffff",
//         borderBottomWidth: 0,
//         elevation: 0,
//         shadowOpacity: 0,
//       },
//       headerTintColor: "#581845",
//       headerShadowVisible: false,
//     });
//   }, [navigation]);

//   useEffect(() => {
//     getRegistrationProgress("Email").then((progressData) => {
//       if (progressData) {
//         setEmailUsername(progressData.emailUsername || "");
//         setSelectedUniversity(progressData.selectedUniversity || "");
//       }
//     });
//   }, []);

//   const selectedDomain = useMemo(() => {
//     return universities.find((uni) => uni.name === selectedUniversity)?.extension || "";
//   }, [selectedUniversity]);

//   const filteredUniversities = useMemo(() => {
//   const q = normalizeText(schoolQuery);

//   // ✅ remove placeholder from results always
//   const list = universities.filter((u) => u.name !== "Choose a university");

//   // show all if empty
//   if (!q) return list;

//   // ✅ If user typed 1 character, prefer "startsWith" first, then fallback to "includes"
//   const starts = list.filter((u) => normalizeText(u.name).startsWith(q));
//   const contains = list.filter((u) => normalizeText(u.name).includes(q));

//   // ✅ avoid duplicates
//   const merged = [...starts, ...contains.filter((u) => !starts.includes(u))];

//   return merged;
// }, [schoolQuery]);


//   // const filteredUniversities = useMemo(() => {
//   //   const q = schoolQuery.trim().toLowerCase();
//   //   if (!q) return universities;
//   //   return universities.filter((u) => u.name.toLowerCase().includes(q));
//   // }, [schoolQuery]);

//   const handleNext = () => {
//     if (!selectedUniversity || selectedUniversity === "Choose a university") {
//       setErrorMessage("All fields are required.");
//       return;
//     }
//     if (emailUsername.trim() === "") {
//       setErrorMessage("Please enter your email username.");
//       return;
//     }

//     setErrorMessage("");

//     const fullEmail = `${emailUsername.toLowerCase()}${selectedDomain}`;
//     saveRegistrationProgress("Email", { email: fullEmail, selectedUniversity });

//     navigation.navigate("PasswordScreen");
//   };

//   const openEmailClient = () => {
//     const subject = "Add my school to 34th Street";
//     const body = [
//       "School name:",
//       "Official school email domain (e.g., @duke.edu):",
//       "Country:",
//       "Program (MBA/MSc/etc.):",
//     ].join("\n");

//     const url =
//       `mailto:${SUPPORT_EMAIL}` +
//       `?subject=${encodeURIComponent(subject)}` +
//       `&body=${encodeURIComponent(body)}`;

//     Linking.openURL(url).catch(() => {
//       Alert.alert("Email app not found", `Please email us at ${SUPPORT_EMAIL} from your mail app.`);
//     });
//   };

//   const openSchoolPicker = () => {
//     setSchoolQuery("");
//     setSchoolModalVisible(true);
//   };

//   const selectSchool = (schoolName) => {
//     setSelectedUniversity(schoolName);
//     setErrorMessage("");
//     setSchoolModalVisible(false);
//   };
//   const closeSchoolPicker = () => {
//   Keyboard.dismiss();
//   setSchoolModalVisible(false);
//   setSchoolQuery("");
// };

//   return (
//     <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//       <SafeAreaView style={styles.container}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           style={{ flex: 1 }}
//         >
//           <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
//             <View style={styles.header}>
//               <View style={styles.logoWrapper}>
//                 <Image source={logo2} style={styles.logo} resizeMode="contain" />
//               </View>
//               <Text style={styles.headerSubtitle}>Connect across top universities</Text>

//               <View style={styles.progressContainer}>
//                 <View style={[styles.progressBar, { width: "40%" }]} />
//               </View>
//             </View>

//             <View style={styles.formContainer}>
//               {/* ✅ University Dropdown */}
//               <Text style={styles.label}>Select Your University</Text>

//               <TouchableOpacity
//                 activeOpacity={0.9}
//                 style={styles.dropdown}
//                 onPress={openSchoolPicker}
//               >
//                 <Text
//                   style={[
//                     styles.dropdownText,
//                     (!selectedUniversity || selectedUniversity === "Choose a university") && styles.dropdownPlaceholder,
//                   ]}
//                   numberOfLines={1}
//                 >
//                   {selectedUniversity && selectedUniversity !== "Choose a university"
//                     ? selectedUniversity
//                     : "Choose a university"}
//                 </Text>
//                 <Ionicons name="chevron-down" size={18} color="#581845" />
//               </TouchableOpacity>

//               {/* ✅ Email Username Input */}
//               <Text style={styles.label}>Enter your school email</Text>
//               <View style={styles.emailContainer}>
//                 <TextInput
//                   autoFocus
//                   value={emailUsername}
//                   onChangeText={(text) => {
//                     setEmailUsername(text);
//                     if (text.trim() !== "") setErrorMessage("");
//                   }}
//                   style={styles.emailInput}
//                   placeholder="your.username"
//                   placeholderTextColor={"#BEBEBE"}
//                   autoCapitalize="none"
//                 />

//                 {!!selectedDomain && selectedUniversity !== "Choose a university" && (
//                   <Text style={styles.emailSuffix}>{selectedDomain}</Text>
//                 )}
//               </View>

//               {/* Error */}
//               {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

//               <Text style={styles.noteText}>
//                 Email verification helps us keep our community safe.
//               </Text>

//               <Text style={styles.noteText2}>
//                 If your school isn’t listed, kindly email us at{" "}
//                 <Text style={styles.mailLink} accessibilityRole="link" onPress={openEmailClient}>
//                   {SUPPORT_EMAIL}
//                 </Text>
//               </Text>

//               {/* Next Button */}
//               <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextButton}>
//                 <MaterialCommunityIcons name="arrow-right-circle" size={48} color="#581845" />
//               </TouchableOpacity>
//             </View>
//           </ScrollView>

//           {/* ✅ School Picker Modal (Bottom Sheet style) */}
//          {/* <Modal visible={schoolModalVisible} animationType="slide" transparent> */}
//          <Modal
//   visible={schoolModalVisible}
//   animationType="slide"
//   transparent
//   onRequestClose={closeSchoolPicker} // ✅ Android back button
// >

//   <KeyboardAvoidingView
//     style={{ flex: 1 }}
//     behavior={Platform.OS === "ios" ? "padding" : undefined}
//   >
//     <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//       <View style={styles.modalOverlay} />
//     </TouchableWithoutFeedback>

// <View
//   style={[
//     styles.modalCard,
//     {
//       paddingTop: insets.top + 12, // ✅ pushes search below time/battery bar
//       paddingBottom: (kbHeight ? kbHeight * 0.15 : 16) + insets.bottom, // ✅ nice on iPhones with home bar
//     },
//   ]}
// >

//   {/* ✅ Modal Top Row (Cancel) */}
// <View style={styles.modalTopRow}>
//   <TouchableOpacity onPress={closeSchoolPicker} activeOpacity={0.8} style={styles.cancelBtn}>
//     <Text style={styles.cancelText}>Cancel</Text>
//   </TouchableOpacity>
// </View>

//       {/* Search */}
//       <View style={styles.searchWrap}>
//         <Ionicons name="search" size={18} color="#777" />
//         <TextInput
//           value={schoolQuery}
//           onChangeText={setSchoolQuery}
//           placeholder="Search your school (e.g., Duke, Darden...)"
//           placeholderTextColor="#999"
//           style={styles.searchInput}
//           autoFocus
//           keyboardShouldPersistTaps="handled"
//         />
//       </View>

//       {/* Results list */}
//       <FlatList
//         data={filteredUniversities}
// keyExtractor={(item) => `${item.name}_${item.extension}`}
//         keyboardShouldPersistTaps="always"
//         contentContainerStyle={{ paddingBottom: kbHeight + 24 }} // ✅ pushes list above keyboard
//         style={{ maxHeight: 420 }} // ✅ prevents full-screen overflow
//         renderItem={({ item }) => (
//           <TouchableOpacity
//             style={styles.schoolRow}
//             onPress={() => {
//               setSelectedUniversity(item.name);
//               setSchoolModalVisible(false);
//               Keyboard.dismiss();
//             }}
//           >
//             <Text style={styles.schoolName}>{item.name}</Text>
//             <Text style={styles.schoolDomain}>{item.extension}</Text>
//           </TouchableOpacity>
//         )}
//       />
//     </View>
//   </KeyboardAvoidingView>
// </Modal>

//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </TouchableWithoutFeedback>
//   );
// };

// export default EmailScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#fff" },
//   scrollContainer: { flexGrow: 1 },

//   header: {
//     backgroundColor: "#581845",
//     borderBottomLeftRadius: 100,
//     borderBottomRightRadius: 100,
//     padding: 40,
//     alignItems: "center",
//   },
//   logoWrapper: {
//     backgroundColor: "white",
//     padding: 12,
//     borderRadius: 80,
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     marginBottom: 10,
//   },
//   logo: { width: 120, height: 80, marginBottom: 10 },

//   progressContainer: {
//     height: 8,
//     width: "80%",
//     backgroundColor: "#eee",
//     borderRadius: 4,
//     marginTop: 20,
//     overflow: "hidden",
//   },
//   progressBar: { height: "100%", backgroundColor: "#ffb60a" },

//   headerSubtitle: { fontSize: 14, color: "#ffb60a", marginTop: 5 },

//   formContainer: { marginTop: 10, marginHorizontal: 20 },

//   label: { marginTop: 20, fontSize: 16, fontWeight: "bold", color: "#581845" },

//   // ✅ dropdown
//   dropdown: {
//     marginTop: 10,
//     borderWidth: 1,
//     borderColor: "#eee",
//     backgroundColor: "#fafafa",
//     borderRadius: 14,
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   dropdownText: { fontSize: 16, color: "#111", fontWeight: "700", flex: 1, marginRight: 10 },
//   dropdownPlaceholder: { color: "#888", fontWeight: "600" },

//   emailContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderBottomColor: "#111",
//     borderBottomWidth: 1,
//     paddingBottom: 10,
//     marginTop: 10,
//     overflow: "hidden",
//   },
//   emailInput: { flex: 1, fontSize: 22, color: "#111" },
//   emailSuffix: { fontSize: 18, color: "gray", fontWeight: "700" },

//   noteText: { fontSize: 12, color: "#581845", fontStyle: "italic", marginBottom: 10, marginTop: 10 },
//   noteText2: { fontSize: 12, color: "#581845", fontStyle: "italic" },

//   nextButton: { marginTop: 30, alignSelf: "center" },

//   errorText: { color: "red", fontSize: 14, marginTop: 6 },

//   mailLink: {
//     color: "#581845",
//     fontWeight: "800",
//     textDecorationLine: "underline",
//     textDecorationColor: "#581845",
//   },
//   modalTopRow: {
//   flexDirection: "row",
//   justifyContent: "flex-end",
//   alignItems: "center",
//   marginBottom: 10,
// },
// cancelBtn: {
//   paddingHorizontal: 10,
//   paddingVertical: 6,
//   borderRadius: 10,
// },
// cancelText: {
//   color: "#581845",
//   fontWeight: "900",
//   fontSize: 14,
// },


//   // ✅ Modal styles
//  modalOverlay: {
//   flex: 1,
//   backgroundColor: "rgba(0,0,0,0.35)",
// },
// modalCard: {
//   backgroundColor: "#fff",
//   padding: 16,
//   borderTopLeftRadius: 18,
//   borderTopRightRadius: 18,
// },
// searchInput: {
//   flex: 1,
//   fontSize: 16,
//   color: "#111",
// },

// searchWrap: {
//   flexDirection: "row",
//   alignItems: "center",
//   gap: 10,
//   backgroundColor: "#f5f5f7",
//   borderRadius: 14,
//   paddingHorizontal: 12,
//   paddingVertical: 10,
//   marginBottom: 12,
// },
//   modalSheet: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     bottom: 0,
//     maxHeight: "75%",
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 18,
//     borderTopRightRadius: 18,
//     padding: 14,
//   },
//   modalHandle: {
//     width: 46,
//     height: 5,
//     borderRadius: 10,
//     backgroundColor: "#ddd",
//     alignSelf: "center",
//     marginBottom: 10,
//   },
//   modalHeaderRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   modalTitle: { fontSize: 16, fontWeight: "900", color: "#111" },

//   searchBox: {
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: "#eee",
//     backgroundColor: "#fafafa",
//     borderRadius: 14,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   // searchInput: { flex: 1, color: "#111", fontSize: 14, paddingVertical: 2 },

//   schoolRow: {
//     paddingVertical: 12,
//     paddingHorizontal: 12,
//     borderRadius: 14,
//     backgroundColor: "#fff",
//     borderWidth: 1,
//     borderColor: "#f0f0f0",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 10,
//   },
//   schoolRowSelected: {
//     borderColor: "#581845",
//     backgroundColor: "#fbf7fb",
//   },
//   schoolName: { fontSize: 15, fontWeight: "800", color: "#111" },
//   schoolNameSelected: { color: "#581845" },
//   schoolDomain: { marginTop: 3, fontSize: 12, color: "#777", fontWeight: "600" },
 

// });
