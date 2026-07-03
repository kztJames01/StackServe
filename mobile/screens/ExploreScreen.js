import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getFeed } from '../api';
import { colors } from 'makerspace-shared/theme';

export default function ExploreScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getFeed();
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (e) {
      setError(e.message || 'Could not load the feed');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doSignOut = async () => {
    if (auth) await signOut(auth);
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity onPress={doSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              Nothing here yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardUser}>{item.user?.name || 'Unknown maker'}</Text>
              <Text style={styles.cardCaption}>{item.caption}</Text>
              {item.description ? (
                <Text style={styles.cardDesc}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {item.likes ?? 0} likes · {item.comments ?? 0} comments
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.ink },
  signOut: { color: colors.brand, fontWeight: '600' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  cardUser: { fontWeight: '700', color: colors.ink, marginBottom: 4 },
  cardCaption: { color: colors.ink, fontSize: 15, marginBottom: 4 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  cardMeta: { color: colors.brand, fontSize: 12 },
  error: { color: '#c0392b', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { color: colors.cream, fontWeight: '600' },
});
