import { Modal, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';

export function Sheet({
  visible,
  onClose,
  children,
  accessibilityLabel,
  closeLabel = 'Tutup',
  hideCloseButton = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
  closeLabel?: string;
  hideCloseButton?: boolean;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
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
          accessibilityViewIsModal
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
          {hideCloseButton ? null : <Button label={closeLabel} variant="quiet" onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}
