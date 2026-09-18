import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * 사진 한 장 고르기. 카메라와 앨범 둘 다 이 한 곳으로 지난다.
 *
 * 웹에는 카메라 권한 흐름이 따로 없고 파일 고르기로 내려앉는다 — 브라우저에서
 * `launchCameraAsync` 를 부르면 기기에 따라 아무 일도 일어나지 않는다.
 */
export async function pickPhoto(
  source: 'camera' | 'library',
  aspect?: [number, number],
): Promise<{ uri: string } | null> {
  const useCamera = source === 'camera' && Platform.OS !== 'web';

  if (useCamera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality: 0.9,
  };

  const picked = useCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (picked.canceled || !picked.assets[0]) return null;
  return { uri: picked.assets[0].uri };
}
