import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

type AurixLogoProps = {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
};

export function AurixLogo({ size = 'medium' }: AurixLogoProps): React.JSX.Element {
  const dimensions = {
    small: { width: 44, height: 38 },
    medium: { width: 72, height: 63 },
    large: { width: 120, height: 105 },
    xlarge: { width: 180, height: 158 },
  }[size];

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('@/assets/images/aurix-logo.png')}
        style={{ width: dimensions.width, height: dimensions.height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});

export default AurixLogo;