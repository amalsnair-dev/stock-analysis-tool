import React, { useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, FlatList, StyleSheet } from 'react-native';

type Column<T> = {
  key: keyof T;
  title: string;
  flex?: number;
};

type UniversalTableModalProps<T> = {
  visible: boolean;
  title: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onSelect: (item: T) => void;
  onClose: () => void;
};

function UniversalTableModal<T extends object>({
  visible, title, data, columns,
  searchPlaceholder = 'Search...', onSelect, onClose,
}: UniversalTableModalProps<T>): React.JSX.Element {
  const [searchText, setSearchText] = useState('');

  const filteredData = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return data;
    return data.filter(item =>
      columns.some(col =>
        String(item[col.key] ?? '').toLowerCase().includes(search),
      ),
    );
  }, [data, columns, searchText]);

  const handleClose = () => { setSearchText(''); onClose(); };
  const handleSelect = (item: T) => { setSearchText(''); onSelect(item); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={searchPlaceholder}
            placeholderTextColor="#AAB3C5"
            style={styles.searchInput}
          />

          <View style={styles.columnHeader}>
            {columns.map(col => (
              <Text key={String(col.key)} style={[styles.columnTitle, { flex: col.flex ?? 1 }]}>
                {col.title}
              </Text>
            ))}
          </View>

          <FlatList
            data={filteredData}
            keyExtractor={(_, index) => String(index)}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => handleSelect(item)}
              >
                {columns.map(col => (
                  <Text key={String(col.key)} style={[styles.cell, { flex: col.flex ?? 1 }]} numberOfLines={1}>
                    {String(item[col.key] ?? '')}
                  </Text>
                ))}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { maxHeight: '80%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#1B2333', borderWidth: 1, borderColor: '#303A4F' },
  modalHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#303A4F' },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5, color: '#FFFFFF' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, fontWeight: '400', color: '#AAB3C5' },
  searchInput: { height: 46, margin: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: 10, fontSize: 15, fontWeight: '600', backgroundColor: '#242D40', borderColor: '#303A4F', color: '#FFFFFF' },
  columnHeader: { flexDirection: 'row', minHeight: 40, alignItems: 'center', paddingHorizontal: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#303A4F', backgroundColor: '#242D40' },
  columnTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, color: '#D4AF37' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#303A4F' },
  rowPressed: { opacity: 0.8, backgroundColor: '#253047' },
  cell: { fontSize: 15, fontWeight: '600', paddingRight: 8, color: '#AAB3C5' },
  empty: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#AAB3C5' },
});

export default UniversalTableModal;