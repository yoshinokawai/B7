import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  AppState,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const STORAGE_FILE = FileSystem.documentDirectory + 'saved_phone_numbers.json';

const SignInScreen = React.memo(({ navigation }) => {
  // ---- State Management ----
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedNumbers, setSavedNumbers] = useState([]);   // Source Data
  const savedNumbersRef = useRef([]);                      // Ref always up-to-date
  const [suggestions, setSuggestions] = useState([]);      // Filtered suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);

  // ---- Advanced useEffect Patterns ----
  useEffect(() => {
    Alert.alert(
      'Welcome',
      'Chào mừng đến với khoá học lập trình React Native tại CodeFresher.vn'
    );
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppStateVisible(nextAppState);
      console.log('AppState', nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ---- Load saved numbers on mount (Persistence) ----
  useEffect(() => {
    loadSavedNumbers();
  }, []);

  const loadSavedNumbers = async () => {
    try {
      const info = await FileSystem.getInfoAsync(STORAGE_FILE);
      if (info.exists) {
        const json = await FileSystem.readAsStringAsync(STORAGE_FILE);
        const parsed = JSON.parse(json);
        setSavedNumbers(parsed);
        savedNumbersRef.current = parsed;
      }
    } catch (e) {
      console.log('Error loading saved numbers', e);
    }
  };

  const savePhoneNumber = async (formatted) => {
    try {
      const digits = formatted.replace(/\D/g, '');
      const existing = [...savedNumbersRef.current];
      // Avoid duplicates
      if (!existing.includes(digits)) {
        existing.push(digits);
        // Update ref and state IMMEDIATELY so suggestions work right away
        savedNumbersRef.current = existing;
        setSavedNumbers(existing);
        await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(existing));
      }
    } catch (e) {
      console.log('Error saving phone number', e);
    }
  };

  // ---- Auto-formatting (Input Masking) ----
  const formatPhoneNumber = (text) => {
    const digits = text.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    let formatted = '';
    for (let i = 0; i < limited.length; i++) {
      if (i === 3 || i === 6 || i === 8) {
        formatted += ' ';
      }
      formatted += limited[i];
    }
    return formatted;
  };

  // Format a raw digit string for display
  const formatDigits = (digits) => {
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 6 || i === 8) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    return formatted;
  };

  // ---- Real-time Validation ----
  const validatePhoneNumber = (formattedNumber) => {
    const digits = formattedNumber.replace(/\D/g, '');
    if (digits.length === 0) return true;
    if (digits.length < 10) return false;
    if (!digits.startsWith('0')) return false;
    return true;
  };

  // ---- Prefix Matching Logic (Search Algorithm) ----
  const filterSuggestions = (inputDigits) => {
    if (inputDigits.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Use ref to always get the latest saved numbers (avoids stale closure)
    const matches = savedNumbersRef.current.filter((saved) => {
      // Inclusion: saved number starts with current input
      // Exclusion: if input doesn't match prefix, exclude it
      return saved.startsWith(inputDigits) && saved !== inputDigits;
    });

    setSuggestions(matches);
    // Exact Match Termination: hide if no partial matches
    setShowSuggestions(matches.length > 0);
  };

  // ---- onChangeText handler (Controlled Component) ----
  const handleChangeText = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);

    const digits = formatted.replace(/\D/g, '');

    // Real-time / Inline Validation
    if (digits.length > 0 && digits.length < 10) {
      setErrorMessage('Số điện thoại không đúng định dạng. Vui lòng nhập lại');
    } else if (digits.length === 10 && !digits.startsWith('0')) {
      setErrorMessage('Số điện thoại không đúng định dạng. Vui lòng nhập lại');
    } else {
      setErrorMessage('');
    }

    // Trigger: prefix matching on every keystroke
    filterSuggestions(digits);
  };

  // ---- Select a suggestion ----
  const handleSelectSuggestion = (digitString) => {
    const formatted = formatDigits(digitString);
    setPhoneNumber(formatted);
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ---- Validation on Action (Button Click Trigger) ----
  const handleContinue = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        '',
        'Số điện thoại không đúng định dạng. Vui lòng nhập lại',
        [{ text: 'OK' }]
      );
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length === 0) {
      Alert.alert('', 'Vui lòng nhập số điện thoại', [{ text: 'OK' }]);
      return;
    }

    // Save to persistence first, then show success
    await savePhoneNumber(phoneNumber);

    // Clear input so user can retype and see suggestions
    setPhoneNumber('');
    setErrorMessage('');

    // Navigate to Home upon valid phone entry
    navigation.navigate('Home');
  };

  // ---- Render a single suggestion item ----
  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <Text style={styles.suggestionText}>{formatDigits(item)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ---- Header ---- */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Đăng nhập</Text>
      </View>

      {/* ---- Body ---- */}
      <View style={styles.body}>
        <Text style={styles.title}>Nhập số điện thoại</Text>
        <Text style={styles.subtitle}>
          Dùng số điện thoại để đăng nhập hoặc đăng ký tài khoản OneHousing Pro
        </Text>

        {/* ---- Controlled TextInput ---- */}
        <TextInput
          style={[
            styles.input,
            errorMessage ? styles.inputError : null,
          ]}
          placeholder="Nhập số điện thoại"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={handleChangeText}
          maxLength={13}
        />

        {/* ---- Suggestion Dropdown (Dynamic Rendering) ---- */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              renderItem={renderSuggestionItem}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* ---- Conditional Rendering: Error Message ---- */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* ---- Continue Button (Trigger) ---- */}
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    fontSize: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a73e8',
    paddingVertical: 8,
    color: '#000',
  },
  inputError: {
    borderBottomColor: 'red',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#1ec2c2',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Trang chủ (Home)</Text>
      <Text style={{ fontSize: 16, marginTop: 10 }}>Đăng nhập thành công!</Text>
    </View>
  );
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
