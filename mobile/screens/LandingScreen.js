import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from 'makerspace-shared/theme';

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>NxtGen</Text>
        </View>
        <Text style={styles.tagline}>
          A global creator hub for students and innovators to share ideas, collaborate on
          projects, and turn dreams into reality.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.primaryBtnText}>Join the Community</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Build with conviction</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logo: { width: 48, height: 48, borderRadius: 10 },
  title: { fontSize: 30, fontWeight: 'bold', color: colors.ink },
  tagline: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: colors.cream, fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  footer: {
    marginTop: 24,
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
  },
});
