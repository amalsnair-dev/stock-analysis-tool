import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { verifyLicense } from '@/services/licenseApi';
import { getBranchCodes } from '@/services/companyApi';
import {
  saveLicenseData,
  saveSerialNumber,
  saveCompanyId,
  saveCompanyName,
} from '@/storage/localStorage';

export default function EntryScreen() {
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedSerial = serialNumber.trim();

    console.log('ENTRY: Continue pressed');
    console.log('ENTRY: Serial Number:', trimmedSerial);

    if (!trimmedSerial) {
      Alert.alert('Required', 'Please enter your Serial Number.');
      return;
    }

    try {
      setLoading(true);

      // 1. Verify License with SoftHub API (Port 8081)
      console.log('ENTRY: Calling verifyLicense...');
      const license = await verifyLicense(trimmedSerial);
      console.log('ENTRY: License response received:', license);

      if (
        license.status !== 'SUCCESS' ||
        license.expired ||
        (license.licenseStatus && license.licenseStatus.toUpperCase() !== 'ACTIVE')
      ) {
        Alert.alert(
          'License Inactive',
          license.message || 'The entered license is not active or has expired.',
        );
        return;
      }

      // 2. Resolve branches using company identifiers
      // The Owner API may register branches under companyDbId (e.g. "2"), companyId ("BTS71680ELS"), or companyCode ("ELS")
      // Try companyId FIRST (e.g. "BTS32479KJ"), then companyCode, then companyDbId
      const candidateCompanyIds: string[] = [
        license.companyId || '',
        license.companyCode || '',
        license.companyDbId ? String(license.companyDbId) : '',
      ].filter(Boolean);

      let resolvedCompanyId = license.companyId || (license.companyDbId ? String(license.companyDbId) : '');
      let branchCodes: string[] = [];

      for (const cid of candidateCompanyIds) {
        console.log('ENTRY: Trying getBranchCodes with company identifier:', cid);
        try {
          const codes = await getBranchCodes(cid);
          if (Array.isArray(codes) && codes.length > 0) {
            resolvedCompanyId = cid;
            branchCodes = codes;
            console.log(`ENTRY: Successfully found branches using "${cid}":`, branchCodes);
            break;
          }
        } catch (err) {
          console.warn(`ENTRY: Error checking branches for "${cid}":`, err);
        }
      }

      if (branchCodes.length === 0) {
        Alert.alert(
          'No Branches Found',
          'No active branches found for this license.',
        );
        return;
      }

      // 3. Save License details locally in SecureStore
      await saveSerialNumber(trimmedSerial);
      await saveLicenseData(license);
      await saveCompanyId(resolvedCompanyId);
      if (license.companyName) {
        await saveCompanyName(license.companyName);
      }
      console.log('ENTRY: License saved locally to SecureStore');

      // 4. Navigate to Shop selection screen
      console.log('ENTRY: Navigating to Shop with companyId:', resolvedCompanyId);
      router.push({
        pathname: '/shop',
        params: {
          companyId: resolvedCompanyId,
          companyName: license.companyName ?? '',
          branchCodes: branchCodes.join(','),
        },
      });
      console.log('ENTRY: Navigation successful');
    } catch (error: any) {
      console.error('ENTRY: License verification failed:', error);
      Alert.alert(
        'Connection Error',
        error?.message || 'Unable to verify license. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.formContainer}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/aurix-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>LICENSE VERIFICATION</Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Serial Number</Text>
              <TextInput
                style={styles.input}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Enter Serial Number (e.g. BTS-STO-...)"
                placeholderTextColor="#8A93A6"
                autoCorrect={false}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#060914" />
              ) : (
                <Text style={styles.continueText}>Verify & Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121826',
  },
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#1B2333',
    borderWidth: 1,
    borderColor: '#2D374D',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 120,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.8,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    color: '#AAB3C5',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    height: 52,
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: '#303A4F',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  continueButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#060914',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
