import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Sheet({
  visible,
  onClose,
  children,
  accessibilityLabel,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(22,24,29,0.4)' }}
        />
        <View
          accessible={false}
          accessibilityLabel={accessibilityLabel}
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            padding: theme.space(5),
            maxHeight: '85%',
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
