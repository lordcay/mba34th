// utils/notify.js
import Toast from 'react-native-root-toast';
import { Audio } from 'expo-av';


let soundObj = null;

export async function playPing() {
  try {
    if (!soundObj) {
      soundObj = new Audio.Sound();
      await soundObj.loadAsync(require('../assets/sounds/incoming.wav')); // add a short wav/mp3 here
    }
    await soundObj.setPositionAsync(0);
    await soundObj.playAsync();
  } catch (_) {}
}

export function showTopToast(text) {
  Toast.show(text, {
    position: 50, // top-ish
    shadow: true,
    backgroundColor: '#111',
    textColor: '#fff',
    opacity: 1,
    duration: 2000,
    containerStyle: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }
  });
}
