import { Text, TextInput, type TextInputProps, View } from 'react-native';

export function TextField({
  label,
  value,
  onChangeText,
  secure,
  placeholder,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  placeholder?: string;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'autoCorrect' | 'textContentType'>) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs uppercase tracking-wide text-forge-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize={secure ? 'none' : undefined}
        autoCorrect={secure ? false : undefined}
        placeholder={placeholder}
        placeholderTextColor="#6e7681"
        className="rounded-xl border border-forge-border bg-forge-elevated px-3 py-3 font-mono text-sm text-white"
        {...inputProps}
      />
    </View>
  );
}
