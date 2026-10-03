import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { updateMe } from '../api';
import { authFormSchema } from 'makerspace-shared/authSchema';
import { getFirebaseAuthErrorMessage } from 'makerspace-shared/firebaseAuthErrors';
import { colors } from 'makerspace-shared/theme';

export default function SignUpScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const doSignUp = async () => {
    setError('');
    const check = authFormSchema('sign-up').safeParse(form);
    if (!check.success) {
      setError(check.error.issues[0].message);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!auth) {
      setError('Firebase is not configured');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      try {
        await updateMe({ name: `${form.firstName} ${form.lastName}` });
      } catch {
        // backend might be down, still let them in
      }
      navigation.reset({ index: 0, routes: [{ name: 'Explore' }] });
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e, 'Sign up failed. Maybe the email is already used.'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ['firstName', 'FIRST NAME', 'Enter your first name', {}],
    ['lastName', 'LAST NAME', 'Enter your last name', {}],
    ['email', 'EMAIL', 'Enter your email', { autoCapitalize: 'none', keyboardType: 'email-address' }],
    ['password', 'PASSWORD', 'Enter your password', { secureTextEntry: true }],
    ['confirmPassword', 'CONFIRM PASSWORD', 'Confirm your password', { secureTextEntry: true }],
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Start Your Journey</Text>
        <Text style={styles.sub}>Create founder profile</Text>

        {fields.map(([key, label, placeholder, extra]) => (
          <View key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={form[key]}
              onChangeText={set(key)}
              placeholder={placeholder}
              {...extra}
            />
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={doSignUp} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.cream} />
          ) : (
            <Text style={styles.btnText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={{ color: colors.textMuted }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.paper },
  heading: { fontSize: 26, fontWeight: 'bold', color: colors.ink, marginBottom: 4 },
  sub: { color: colors.textMuted, marginBottom: 24, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  label: { fontSize: 11, letterSpacing: 1.5, color: colors.brand, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
    color: colors.ink,
  },
  error: { color: '#c0392b', marginBottom: 12 },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: colors.cream, fontWeight: '600', fontSize: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 24 },
  link: { color: colors.brand, fontWeight: '600' },
});
