import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

type ValidationPopupProps = {
  visible: boolean;
  message: string;
  confirmation?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
};

export function ValidationPopup({
  visible,
  message,
  confirmation = false,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
}: ValidationPopupProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Text style={styles.iconText}>!</Text>
            </View>
          </View>

          {confirmation && (
            <Text style={styles.title}>Are you sure?</Text>
          )}

          <Text style={styles.message}>{message}</Text>

          {confirmation ? (
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={onConfirm}>
                <Text style={styles.confirmText}>{confirmText}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.okButton} onPress={onClose}>
              <Text style={styles.okText}>OK</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#1B2333',
    borderWidth: 1,
    borderColor: '#303A4F',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 27, fontWeight: '300', lineHeight: 30, color: '#AAB3C5' },
  iconOuter: {
    width: 58, height: 58, borderRadius: 29, borderWidth: 2,
    borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 26, fontWeight: '900', color: '#060914' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: '#FFFFFF' },
  message: { width: '100%', fontSize: 15, lineHeight: 22, fontWeight: '500', textAlign: 'center', marginBottom: 22, color: '#AAB3C5' },
  buttonRow: { width: '100%', flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1,
    borderColor: '#303A4F', backgroundColor: '#253047', alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  confirmButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  okButton: {
    alignSelf: 'center', minWidth: 110, height: 48, borderRadius: 12,
    backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  okText: { fontSize: 15, fontWeight: '800', color: '#060914' },
});

export default ValidationPopup;