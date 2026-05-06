import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops' }} />
      <View className="flex-1 items-center justify-center bg-forge-bg px-4">
        <Text className="text-xl font-bold text-white">This forge path does not exist.</Text>
        <Link href="/" className="mt-6 font-mono text-forge-accent">
          Go home
        </Link>
      </View>
    </>
  );
}
